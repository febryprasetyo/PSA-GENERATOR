import { NextResponse } from "next/server";
import { db } from "@/backend/db";
import { machines } from "@/backend/db/schema";
import { requireAuth } from "@/backend/auth/guard";
import { eq } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Only Admin and Operator can edit machines
  if (auth.payload?.role === "client") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Machine ID is required" }, { status: 400 });

  try {
    const body = await request.json();
    const { clientId, machineName, model, capacityMcDay, capacityMcMonth, serialNumber } = body;

    const updateData: any = {};
    if (clientId !== undefined) updateData.clientId = clientId || null;
    if (machineName) updateData.machineName = machineName;
    if (model !== undefined) updateData.model = model;
    if (capacityMcDay !== undefined) updateData.capacityMcDay = capacityMcDay;
    if (capacityMcMonth !== undefined) updateData.capacityMcMonth = capacityMcMonth;
    
    // Only Admin can change serial number
    if (serialNumber && auth.payload?.role === "admin") {
      updateData.serialNumber = serialNumber;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const [updatedMachine] = await db.update(machines)
      .set(updateData)
      .where(eq(machines.id, id))
      .returning();

    if (!updatedMachine) {
      return NextResponse.json({ error: "Machine not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, machine: updatedMachine });
  } catch (error: any) {
    console.error("PUT Machine Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Only Admin and Operator can delete/request delete machines
  if (auth.payload?.role !== "admin" && auth.payload?.role !== "operator") {
    return NextResponse.json({ error: "Forbidden: Admin or Operator only" }, { status: 403 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Machine ID is required" }, { status: 400 });

  try {
    let updateData: any = {};
    if (auth.payload?.role === "operator") {
      updateData = { pendingDelete: true };
    } else {
      updateData = { deletedAt: new Date(), pendingDelete: false }; // Soft delete
    }

    const [deletedMachine] = await db.update(machines)
      .set(updateData)
      .where(eq(machines.id, id))
      .returning({ id: machines.id });

    if (!deletedMachine) {
      return NextResponse.json({ error: "Machine not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: deletedMachine.id });
  } catch (error) {
    console.error("DELETE Machine Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
