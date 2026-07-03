import { NextResponse } from "next/server";
import { db } from "@/backend/db";
import { machines } from "@/backend/db/schema";
import { requireAuth } from "@/backend/auth/guard";
import { eq } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (auth.payload?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await db.select().from(machines).where(eq(machines.id, id)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ error: "Machine not found" }, { status: 404 });
    }

    const machine = existing[0];

    await db.update(machines)
      .set({
        clientId: null,
        machineName: `Standby (${machine.serialNumber})`,
        updatedAt: new Date()
      })
      .where(eq(machines.id, id));

    return NextResponse.json({ message: "Machine unassigned successfully" });
  } catch (error) {
    console.error("POST Unassign Machine Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
