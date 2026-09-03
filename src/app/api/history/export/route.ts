import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { machineReadings, machines, masterHospitals } from "@/backend/db/schema";
import { requireAuth } from "@/backend/auth/guard";
import { eq, like, or, desc, and, isNull, isNotNull, avg, count, inArray, sql } from "drizzle-orm";
import { redis } from "@/backend/redis";
import { buildCsvHeader, formatExportTimestamp, formatNullableCsvMetric, shouldIncludeMachineName } from "./export-query";
import { resolveHospitalScope } from "@/backend/auth/client-scope";
import { localTelemetryTimeSql } from "@/backend/telemetry/timezone-sql";

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

    // 1. Role-based hospital constraint. Client requests can never override their assigned RS.
    const scope = resolveHospitalScope(userRole, userClientId as string | undefined, hospitalIdParam);
    if (!scope.allowed) {
      return new NextResponse("\uFEFFNo data available for user without assigned hospital", {
        status: 200,
        headers: { "Content-Type": "text/csv; charset=utf-8" },
      });
    }
    if (scope.hospitalId) conditions.push(eq(machines.clientId, scope.hospitalId));

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
    const localTerminalTime = localTelemetryTimeSql(machineReadings.terminalTime, masterHospitals.province);
    const startLocal = startDateParam?.replace("T", " ").replace(/Z$/, "") || startDate.toISOString().replace("T", " ").replace("Z", "");
    const endLocal = endDateParam?.replace("T", " ").replace(/Z$/, "") || endDate.toISOString().replace("T", " ").replace("Z", "");
    conditions.push(sql`${localTerminalTime} >= ${startLocal}::timestamp`);
    conditions.push(sql`${localTerminalTime} <= ${endLocal}::timestamp`);

    // 5. Exclude soft-deleted machines & unassigned machines
    conditions.push(isNull(machines.deletedAt));
    conditions.push(isNotNull(machines.clientId));

    const whereClause = and(...conditions);

    // Caching Key Strategy (Redis)
    const cacheKey = `export:v5:30m:${userRole}:${userClientId || "all"}:${hospitalIdParam || "all"}:${serialNumberParam || "all"}:${startDate.toISOString()}:${endDate.toISOString()}:${query || "none"}`;

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

    const bucketStart = sql<Date>`date_bin('30 minutes', ${machineReadings.terminalTime}, TIMESTAMPTZ '1970-01-01 00:00:00+00')`;
    const groupedRows = await db.select({
      hospitalId: masterHospitals.id,
      hospitalName: masterHospitals.hospitalName,
      province: masterHospitals.province,
      machineId: machines.id,
      serialNumber: machines.serialNumber,
      machineName: machines.machineName,
      bucketStart,
      oxygenPurity: avg(machineReadings.oxygenPurity),
      tankPressure: avg(machineReadings.tankPressure),
      vessel1: avg(machineReadings.vessel1),
      vessel2: avg(machineReadings.vessel2),
      centralFlow: avg(machineReadings.flowSentral),
      boosterFlow: avg(machineReadings.flowBooster),
      totalFlow: avg(machineReadings.totalFlow),
      runningTimeHours: avg(machineReadings.runningTimeHours),
    }).from(machineReadings)
      .leftJoin(machines, eq(machineReadings.machineId, machines.id))
      .leftJoin(masterHospitals, eq(machines.clientId, masterHospitals.id))
      .where(whereClause)
      .groupBy(masterHospitals.id, masterHospitals.hospitalName, masterHospitals.province, machines.id, machines.serialNumber, machines.machineName, bucketStart)
      .orderBy(desc(bucketStart));

    const representedHospitalIds = [...new Set(groupedRows.map((row) => row.hospitalId).filter((id): id is string => Boolean(id)))];
    const machineCounts = representedHospitalIds.length ? await db.select({
      hospitalId: machines.clientId,
      value: count(),
    }).from(machines).where(and(inArray(machines.clientId, representedHospitalIds), isNull(machines.deletedAt))).groupBy(machines.clientId) : [];
    const includeMachineName = shouldIncludeMachineName(machineCounts.map((item) => Number(item.value)));

    // Streaming CSV output with UTF-8 BOM
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // UTF-8 BOM for Excel compatibility
          controller.enqueue(encoder.encode("\uFEFF"));

          // CSV Header
          const header = buildCsvHeader(includeMachineName).map((h) => `"${h}"`).join(",") + "\n";

          controller.enqueue(encoder.encode(header));

          let rowNumber = 1;
          let fullCsvAccumulator = header;
          const CHUNK_SIZE = 2000;
          for (let offset = 0; offset < groupedRows.length; offset += CHUNK_SIZE) {
            const batch = groupedRows.slice(offset, offset + CHUNK_SIZE);
            let chunkStr = "";
            for (const item of batch) {
              const formattedTime = item.bucketStart ? formatExportTimestamp(item.bucketStart, item.province) : "-";
              
              const row = [
                rowNumber++,
                ...(includeMachineName ? [`"${(item.machineName || "").replace(/"/g, '""')}"`] : []),
                `"${(item.hospitalName || "Not Assigned").replace(/"/g, '""')}"`,
                `"${formattedTime}"`,
                item.oxygenPurity ? parseFloat(item.oxygenPurity).toFixed(2) : "0.00",
                item.tankPressure ? parseFloat(item.tankPressure).toFixed(2) : "0.00",
                formatNullableCsvMetric(item.vessel1),
                formatNullableCsvMetric(item.vessel2),
                item.centralFlow ? parseFloat(item.centralFlow).toFixed(2) : "0.00",
                item.boosterFlow ? parseFloat(item.boosterFlow).toFixed(2) : "0.00",
                item.totalFlow ? parseFloat(item.totalFlow).toFixed(2) : "0.00",
                item.runningTimeHours ? parseFloat(item.runningTimeHours).toFixed(2) : "0.00",
              ].join(",");

              chunkStr += row + "\n";
            }

            controller.enqueue(encoder.encode(chunkStr));
            fullCsvAccumulator += chunkStr;
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
