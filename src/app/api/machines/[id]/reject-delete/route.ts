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
    return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Machine ID is required" }, { status: 400 });

  try {
    const [updatedMachine] = await db.update(machines)
      .set({ pendingDelete: false })
      .where(eq(machines.id, id))
      .returning({ id: machines.id });

    if (!updatedMachine) {
      return NextResponse.json({ error: "Machine not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: updatedMachine.id });
  } catch (error) {
    console.error("Reject Delete Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
