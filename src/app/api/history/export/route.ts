import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { machineReadings, machines, masterHospitals } from "@/backend/db/schema";
import { requireAuth } from "@/backend/auth/guard";
import { eq, like, or, desc, and, isNull, isNotNull, gte, lte } from "drizzle-orm";
import { redis } from "@/backend/redis";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const serialNumberParam = searchParams.get("serialNumber") || "";
    const hospitalIdParam = searchParams.get("hospitalId") || "";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const now = new Date();
    let endDate = endDateParam ? new Date(endDateParam) : now;
    if (isNaN(endDate.getTime())) endDate = now;

    // Default start date: 3 months ago (90 days) if not specified
    const maxRangeMs = 90 * 24 * 60 * 60 * 1000; // 90 days in ms
    let startDate = startDateParam ? new Date(startDateParam) : new Date(endDate.getTime() - maxRangeMs);
    if (isNaN(startDate.getTime())) startDate = new Date(endDate.getTime() - maxRangeMs);

    // Validate 1: Start date must not be greater than end date
    if (startDate > endDate) {
      return NextResponse.json(
        { error: "Tanggal mulai tidak boleh lebih besar dari tanggal akhir." },
        { status: 400 }
      );
    }

    // Validate 2: Date range max 3 months (90 days)
    const diffMs = endDate.getTime() - startDate.getTime();
    if (diffMs > maxRangeMs) {
      return NextResponse.json(
        { error: "Maksimum rentang waktu pengunduhan data adalah 3 bulan (90 hari)." },
        { status: 400 }
      );
    }

    const userRole = auth.payload?.role;
    const userClientId = auth.payload?.clientId;

    // Base conditions
    const conditions = [];

    // 1. Role-based client constraint
    if (userRole === "client") {
      if (!userClientId) {
        return new NextResponse("\uFEFFNo data available for user without assigned hospital", {
          status: 200,
          headers: { "Content-Type": "text/csv; charset=utf-8" },
        });
      }
      conditions.push(eq(machines.clientId, userClientId as string));
    } else if (hospitalIdParam) {
      // Admin / Operator filtering by specific hospital
      conditions.push(eq(machines.clientId, hospitalIdParam));
    }

    // 2. Specific machine filter
    if (serialNumberParam) {
      conditions.push(eq(machines.serialNumber, serialNumberParam));
    }

    // 3. Search query constraint
    if (query) {
      conditions.push(
        or(
          like(machines.serialNumber, `%${query}%`),
          like(masterHospitals.hospitalName, `%${query}%`)
        )
      );
    }

    // 4. Date range constraint
    conditions.push(gte(machineReadings.receivedAt, startDate));
    conditions.push(lte(machineReadings.receivedAt, endDate));

    // 5. Exclude soft-deleted machines & unassigned machines
    conditions.push(isNull(machines.deletedAt));
    conditions.push(isNotNull(machines.clientId));

    const whereClause = and(...conditions);

    // Caching Key Strategy (Redis)
    const cacheKey = `export:machine_readings:${userRole}:${userClientId || "all"}:${hospitalIdParam || "all"}:${serialNumberParam || "all"}:${startDate.toISOString()}:${endDate.toISOString()}:${query || "none"}`;

    try {
      const cachedCsv = await redis.get(cacheKey);
      if (cachedCsv) {
        console.log("[Export API] Serving cached CSV export from Redis");
        return new NextResponse(cachedCsv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="machine_readings_${startDate.toISOString().split("T")[0]}_to_${endDate.toISOString().split("T")[0]}.csv"`,
            "Cache-Control": "private, max-age=300",
          },
        });
      }
    } catch (redisErr) {
      console.warn("[Export API] Redis cache read error:", redisErr);
    }

    // Streaming CSV output with UTF-8 BOM
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // UTF-8 BOM for Excel compatibility
          controller.enqueue(encoder.encode("\uFEFF"));

          // CSV Header
          const header = [
            "No",
            "Serial Number",
            "Nama Rumah Sakit",
            "Waktu (Timestamp)",
            "Oxygen Purity (%)",
            "Tank Pressure (bar)",
            "Flow Meter Sentral (L/min)",
            "Flow Meter Booster (L/min)",
            "Total Flow",
            "Running Time (Jam)",
          ].map((h) => `"${h}"`).join(",") + "\n";

          controller.enqueue(encoder.encode(header));

          const CHUNK_SIZE = 2000;
          let offset = 0;
          let rowNumber = 1;
          let fullCsvAccumulator = header;

          while (true) {
            const batch = await db
              .select({
                id: machineReadings.id,
                serialNumber: machineReadings.serialNumber,
                hospitalName: masterHospitals.hospitalName,
                timestamp: machineReadings.receivedAt,
                oxygenPurity: machineReadings.oxygenPurity,
                tankPressure: machineReadings.tankPressure,
                centralFlow: machineReadings.flowSentral,
                boosterFlow: machineReadings.flowBooster,
                totalFlow: machineReadings.totalFlow,
                runningTimeHours: machineReadings.runningTimeHours,
              })
              .from(machineReadings)
              .leftJoin(machines, eq(machineReadings.machineId, machines.id))
              .leftJoin(masterHospitals, eq(machines.clientId, masterHospitals.id))
              .where(whereClause)
              .orderBy(desc(machineReadings.receivedAt))
              .limit(CHUNK_SIZE)
              .offset(offset);

            if (batch.length === 0) break;

            let chunkStr = "";
            for (const item of batch) {
              const formattedTime = item.timestamp
                ? new Date(item.timestamp).toISOString().replace("T", " ").substring(0, 19)
                : "-";
              
              const row = [
                rowNumber++,
                `"${(item.serialNumber || "").replace(/"/g, '""')}"`,
                `"${(item.hospitalName || "Not Assigned").replace(/"/g, '""')}"`,
                `"${formattedTime}"`,
                item.oxygenPurity ? parseFloat(item.oxygenPurity).toFixed(2) : "0.00",
                item.tankPressure ? parseFloat(item.tankPressure).toFixed(2) : "0.00",
                item.centralFlow ? parseFloat(item.centralFlow).toFixed(2) : "0.00",
                item.boosterFlow ? parseFloat(item.boosterFlow).toFixed(2) : "0.00",
                item.totalFlow ? parseFloat(item.totalFlow).toFixed(2) : "0.00",
                item.runningTimeHours ? parseFloat(item.runningTimeHours).toFixed(2) : "0.00",
              ].join(",");

              chunkStr += row + "\n";
            }

            controller.enqueue(encoder.encode(chunkStr));
            fullCsvAccumulator += chunkStr;

            offset += batch.length;
            if (batch.length < CHUNK_SIZE) break;
          }

          // Cache in Redis for 5 minutes (300 seconds) if size < 10MB
          if (fullCsvAccumulator.length < 10 * 1024 * 1024) {
            try {
              await redis.set(cacheKey, "\uFEFF" + fullCsvAccumulator, "EX", 300);
            } catch (rErr) {
              console.warn("[Export API] Redis cache write error:", rErr);
            }
          }

          controller.close();
        } catch (err) {
          console.error("[Export API] Stream error:", err);
          controller.error(err);
        }
      },
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="machine_readings_${startDate.toISOString().split("T")[0]}_to_${endDate.toISOString().split("T")[0]}.csv"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("[Export API] Error generating export:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
