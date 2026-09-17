import { NextResponse } from "next/server";
import { db } from "@/backend/db";
import { machines, masterHospitals } from "@/backend/db/schema";
import { requireAuth } from "@/backend/auth/guard";
import { eq, isNull, and } from "drizzle-orm";
import { redis } from "@/backend/redis";
import { getMachineLatestRedisKey } from "@/shared/config";
import { resolveHeartbeatStatus } from "@/backend/telemetry/state";
import { getCmcRegisteredSerials, isUnassignedAutomaticMachine } from "@/backend/machines/cmcRegistration";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const userRole = auth.payload?.role;
    const userClientId = auth.payload?.clientId;

    let allMachines;

    if (userRole === "client") {
      if (!userClientId) {
        return NextResponse.json({ machines: [] });
      }
      // Only get machines for this client
      allMachines = await db.select({
        id: machines.id,
        clientId: machines.clientId,
        hospitalName: masterHospitals.hospitalName,
        serialNumber: machines.serialNumber,
        machineName: machines.machineName,
        model: machines.model,
        capacityMcDay: machines.capacityMcDay,
        capacityMcMonth: machines.capacityMcMonth,
        status: machines.status,
        lastSeenAt: machines.lastSeenAt,
        createdAt: machines.createdAt,
        pendingDelete: machines.pendingDelete,
      })
      .from(machines)
      .leftJoin(masterHospitals, eq(machines.clientId, masterHospitals.id))
      .where(and(eq(machines.clientId, userClientId as string), isNull(machines.deletedAt)));
    } else {
      // Admin and Operator see all
      allMachines = await db.select({
        id: machines.id,
        clientId: machines.clientId,
        hospitalName: masterHospitals.hospitalName,
        serialNumber: machines.serialNumber,
        machineName: machines.machineName,
        model: machines.model,
        capacityMcDay: machines.capacityMcDay,
        capacityMcMonth: machines.capacityMcMonth,
        status: machines.status,
        lastSeenAt: machines.lastSeenAt,
        createdAt: machines.createdAt,
        pendingDelete: machines.pendingDelete,
      })
      .from(machines)
      .leftJoin(masterHospitals, eq(machines.clientId, masterHospitals.id))
      .where(isNull(machines.deletedAt));
    }
    const cmcSerials = await getCmcRegisteredSerials(
      allMachines.filter(isUnassignedAutomaticMachine).map((machine) => machine.serialNumber),
    );
    const visibleMachines = allMachines.filter((machine) =>
      !isUnassignedAutomaticMachine(machine) || !cmcSerials.has(machine.serialNumber),
    );
    const updatedMachines = await Promise.all(visibleMachines.map(async (machine) => {
      const latestDataStr = await redis.get(getMachineLatestRedisKey(machine.serialNumber));
      let heartbeat: string | Date | null = machine.lastSeenAt;
      if (latestDataStr) {
        try {
          const latestData = JSON.parse(latestDataStr);
          heartbeat = latestData.receivedAt || latestData.updatedAt || latestData.terminalTime || heartbeat;
        } catch {
          console.error("Failed to parse Redis telemetry for", machine.serialNumber);
        }
      }
      return {
        ...machine,
        status: resolveHeartbeatStatus(heartbeat, machine.status),
        lastSeenAt: heartbeat,
      };
    }));

    return NextResponse.json({ machines: updatedMachines });
  } catch (error) {
    console.error("GET Machines Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (auth.payload?.role === "client") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { clientId, serialNumber, machineName, model, capacityMcDay, capacityMcMonth } = body;

    if (!serialNumber || !machineName) {
      return NextResponse.json({ error: "Serial Number dan Nama Mesin wajib diisi" }, { status: 400 });
    }

    const [newMachine] = await db.insert(machines).values({
      clientId: clientId || null,
      serialNumber,
      machineName,
      model,
      capacityMcDay,
      capacityMcMonth,
      status: "offline",
    }).returning();

    return NextResponse.json({ success: true, machine: newMachine }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST Machine Error:", error);
    if (typeof error === 'object' && error !== null && 'code' in error && (error as Record<string, unknown>).code === '23505') { 
      return NextResponse.json({ error: "Serial number already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
