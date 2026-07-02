import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { machineReadings, machines, masterHospitals } from "@/backend/db/schema";
import { requireAuth } from "@/backend/auth/guard";
import { eq, like, or, desc, sql, and, isNull, isNotNull, gte, lte } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const query = searchParams.get("query") || "";
    
    // Status filter could be added here if needed, but for history we mostly show all readings
    const statusFilter = searchParams.get("status") || "all"; 
    
    // Date filters
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const offset = (page - 1) * limit;

    const userRole = auth.payload?.role;
    const userClientId = auth.payload?.clientId;

    // Base conditions
    const conditions = [];

    // Client constraint
    if (userRole === "client") {
      if (!userClientId) {
        return NextResponse.json({ entries: [], total: 0, page, limit });
      }
      conditions.push(eq(machines.clientId, userClientId as string));
    }

    // Search query constraint
    if (query) {
      conditions.push(
        or(
          like(machines.serialNumber, `%${query}%`),
          like(masterHospitals.hospitalName, `%${query}%`)
        )
      );
    }

    // Status constraint (based on the machine's current status, or reading status? History is just readings. Let's filter on machine's current status if requested)
    if (statusFilter !== "all") {
      conditions.push(eq(machines.status, statusFilter));
    }

    // Don't show deleted machines
    conditions.push(isNull(machines.deletedAt));

    // Only show machines that are assigned to a hospital (RS)
    conditions.push(isNotNull(machines.clientId));

    // Date range constraint
    if (startDate) {
      conditions.push(gte(machineReadings.receivedAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(machineReadings.receivedAt, new Date(endDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch paginated data
    const entries = await db.select({
      id: machineReadings.id,
      serialNumber: machineReadings.serialNumber,
      hospitalName: masterHospitals.hospitalName,
      status: machines.status,
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
    .limit(limit)
    .offset(offset);

    // Count total rows for pagination
    const [{ count }] = await db.select({ count: sql<number>`cast(count(${machineReadings.id}) as int)` })
    .from(machineReadings)
    .leftJoin(machines, eq(machineReadings.machineId, machines.id))
    .leftJoin(masterHospitals, eq(machines.clientId, masterHospitals.id))
    .where(whereClause);

    // Format data to match frontend expectations
    const formattedEntries = entries.map(entry => ({
      id: entry.id,
      stationId: entry.serialNumber,
      stationName: entry.hospitalName || "Not Assigned",
      timestamp: entry.timestamp ? new Date(entry.timestamp).toLocaleString("id-ID") : "Unknown",
      oxygenPurity: entry.oxygenPurity ? parseFloat(entry.oxygenPurity) : 0,
      tankPressure: entry.tankPressure ? parseFloat(entry.tankPressure) : 0,
      centralFlow: entry.centralFlow ? parseFloat(entry.centralFlow) : 0,
      boosterFlow: entry.boosterFlow ? parseFloat(entry.boosterFlow) : 0,
      totalFlow: entry.totalFlow ? parseFloat(entry.totalFlow) : 0,
      runningTime: entry.runningTimeHours ? parseFloat(entry.runningTimeHours) : 0,
      status: entry.status || "offline",
    }));

    return NextResponse.json({ 
      entries: formattedEntries,
      total: count,
      page,
      limit
    });
  } catch (error) {
    console.error("GET History Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
