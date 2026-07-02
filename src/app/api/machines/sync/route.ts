import { NextResponse } from "next/server";
import { db } from "@/backend/db";
import { machines } from "@/backend/db/schema";
import { requireAuth } from "@/backend/auth/guard";
import { redis } from "@/backend/redis";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (auth.payload?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Only Admin can sync machines" }, { status: 403 });
  }

  try {
    // 1. Get all keys matching psa:machine:latest:* from Redis
    const keys = await redis.keys("psa:machine:latest:*");
    let syncedCount = 0;

    for (const key of keys) {
      // key format: psa:machine:latest:SERIAL
      const serialNumber = key.replace("psa:machine:latest:", "");
      
      if (!serialNumber) continue;

      // 2. Check if it exists in DB
      const existing = await db.select({ id: machines.id, deletedAt: machines.deletedAt }).from(machines).where(eq(machines.serialNumber, serialNumber)).limit(1);

      // 3. If not exists, insert it
      if (existing.length === 0) {
        await db.insert(machines).values({
          serialNumber,
          machineName: `Auto-Synced (${serialNumber})`,
          status: "online",
          lastSeenAt: new Date(),
        });
        syncedCount++;
      } else if (existing[0].deletedAt !== null) {
        // If it exists but was soft deleted, undelete it
        await db.update(machines)
          .set({ 
            deletedAt: null, 
            pendingDelete: false, 
            status: "online", 
            lastSeenAt: new Date() 
          })
          .where(eq(machines.id, existing[0].id));
        syncedCount++;
      }
    }

    return NextResponse.json({ message: "Sync successful", syncedCount });
  } catch (error) {
    console.error("POST Sync Machines Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
