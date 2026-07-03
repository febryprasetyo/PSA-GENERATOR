import { NextResponse } from "next/server";
import { db } from "@/backend/db";
import { machines, masterHospitals, machineLatestReadings } from "@/backend/db/schema";
import { requireAuth } from "@/backend/auth/guard";
import { eq, isNull, and } from "drizzle-orm";
import { redis } from "@/backend/redis";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const userRole = auth.payload?.role;
    const userClientId = auth.payload?.clientId;

    const baseQuery = db.select({
      id: machines.serialNumber, // Map serialNumber to id for frontend compatibility
      serialNumber: machines.serialNumber,
      hospitalName: masterHospitals.hospitalName,
      province: masterHospitals.province,
      city: masterHospitals.city,
      capacityMcDay: machines.capacityMcDay,
      capacityMcMonth: machines.capacityMcMonth,
      status: machines.status, // "offline" etc.
      lastSeenAt: machines.lastSeenAt,
      dbOxygenPurity: machineLatestReadings.oxygenPurity,
      dbTankPressure: machineLatestReadings.tankPressure,
      dbFlowSentral: machineLatestReadings.flowSentral,
      dbFlowBooster: machineLatestReadings.flowBooster,
      dbTotalFlow: machineLatestReadings.totalFlow,
      dbRunningTimeHours: machineLatestReadings.runningTimeHours,
      dbTerminalTime: machineLatestReadings.terminalTime,
      dbStartOfDayTotalFlow: machineLatestReadings.startOfDayTotalFlow,
    })
    .from(machines)
    .leftJoin(masterHospitals, eq(machines.clientId, masterHospitals.id))
    .leftJoin(machineLatestReadings, eq(machines.id, machineLatestReadings.machineId));

    let allMachines;

    if (userRole === "client") {
      if (!userClientId) {
        return NextResponse.json({ machines: [] });
      }
      allMachines = await baseQuery.where(and(eq(machines.clientId, userClientId as string), isNull(machines.deletedAt)));
    } else {
      allMachines = await baseQuery.where(isNull(machines.deletedAt));
    }

    interface DashboardMachine {
      serialNumber: string;
      hospitalName?: string | null;
      province?: string | null;
      city?: string | null;
      capacityMcDay?: string | null;
      capacityMcMonth?: string | null;
      status: string;
      dbOxygenPurity?: string | null;
      dbTankPressure?: string | null;
      dbFlowSentral?: string | null;
      dbFlowBooster?: string | null;
      dbTotalFlow?: string | null;
      dbStartOfDayTotalFlow?: string | null;
      dbRunningTimeHours?: string | null;
      dbTerminalTime?: string | Date | null;
      lastSeenAt?: string | Date | null;
      [key: string]: unknown;
    }

    interface LatestData {
      receivedAt?: string;
      updatedAt?: string;
      terminalTime?: string;
      oxygenPurity?: string;
      tankPressure?: string;
      flowSentral?: string;
      flowBooster?: string;
      totalFlow?: string;
      startOfDayTotalFlow?: string;
      runningTimeHours?: string;
      [key: string]: unknown;
    }

    // Fetch latest data from Redis
    const formattedMachines = await Promise.all(allMachines.map(async (m: DashboardMachine) => {
      const redisKey = `psa:machine:latest:${m.serialNumber}`;
      const latestDataStr = await redis.get(redisKey);
      let latestData: LatestData = {};
      
      if (latestDataStr) {
        try {
          latestData = JSON.parse(latestDataStr);
        } catch {
          console.error("Failed to parse redis data for", m.serialNumber);
        }
      }

      const lastUpdateStr = latestData.receivedAt || latestData.updatedAt || latestData.terminalTime || m.dbTerminalTime || m.lastSeenAt || new Date().toISOString();
      const isOffline = (new Date().getTime() - new Date(lastUpdateStr).getTime()) > 5 * 60 * 1000;

      const machineData = {
        id: m.serialNumber,
        hospitalName: m.hospitalName || "Not Assigned",
        region: m.province ? (m.city ? `${m.city}, ${m.province}` : m.province) : (m.city || "Unknown Region"),
        capacityMcDay: m.capacityMcDay ? parseFloat(m.capacityMcDay as string) : 0,
        capacityMcMonth: m.capacityMcMonth ? parseFloat(m.capacityMcMonth as string) : 0,
        machineCount: 1,
        status: isOffline ? "offline" : m.status,
        oxygenPurity: latestData.oxygenPurity !== undefined && latestData.oxygenPurity !== null ? parseFloat(latestData.oxygenPurity) : (m.dbOxygenPurity !== null ? parseFloat(m.dbOxygenPurity as string) : null),
        tankPressure: latestData.tankPressure !== undefined && latestData.tankPressure !== null ? parseFloat(latestData.tankPressure) : (m.dbTankPressure !== null ? parseFloat(m.dbTankPressure as string) : null),
        centralFlow: latestData.flowSentral !== undefined && latestData.flowSentral !== null ? parseFloat(latestData.flowSentral) : (m.dbFlowSentral !== null ? parseFloat(m.dbFlowSentral as string) : null),
        boosterFlow: latestData.flowBooster !== undefined && latestData.flowBooster !== null ? parseFloat(latestData.flowBooster) : (m.dbFlowBooster !== null ? parseFloat(m.dbFlowBooster as string) : null),
        totalFlow: latestData.totalFlow !== undefined && latestData.totalFlow !== null ? parseFloat(latestData.totalFlow) : (m.dbTotalFlow !== null ? parseFloat(m.dbTotalFlow as string) : null),
        startOfDayTotalFlow: latestData.startOfDayTotalFlow !== undefined && latestData.startOfDayTotalFlow !== null ? parseFloat(latestData.startOfDayTotalFlow) : (m.dbStartOfDayTotalFlow !== null ? parseFloat(m.dbStartOfDayTotalFlow as string) : null),
        runningTimeHours: latestData.runningTimeHours !== undefined && latestData.runningTimeHours !== null ? parseFloat(latestData.runningTimeHours) : (m.dbRunningTimeHours !== null ? parseFloat(m.dbRunningTimeHours as string) : null),
        lastUpdate: lastUpdateStr,
        actualDailyFlow: 0,
      };
      
      // Calculate actual daily flow
      if (machineData.totalFlow !== null) {
        if (machineData.startOfDayTotalFlow !== null) {
          machineData.actualDailyFlow = Math.max(0, machineData.totalFlow - machineData.startOfDayTotalFlow);
        } else {
          machineData.actualDailyFlow = 0; // If we don't have the baseline, we can't know daily flow yet
        }
      } else {
        machineData.actualDailyFlow = 0;
      }

      return machineData;
    }));

    return NextResponse.json({ machines: formattedMachines });
  } catch (error) {
    console.error("GET Dashboard Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
