import { NextResponse } from "next/server";
import { db } from "@/backend/db";
import { masterHospitals, users, machines } from "@/backend/db/schema";
import { requireAuth } from "@/backend/auth/guard";
import { eq } from "drizzle-orm";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (auth.payload?.role !== "admin" && auth.payload?.role !== "operator") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { hospitalName, province, city, address, owner, kelas } = body;

    const updateData: Record<string, unknown> = {};
    if (hospitalName !== undefined) updateData.hospitalName = hospitalName;
    if (province !== undefined) updateData.province = province;
    if (city !== undefined) updateData.city = city;
    if (address !== undefined) updateData.address = address;
    if (owner !== undefined) updateData.owner = owner;
    if (kelas !== undefined) updateData.kelas = kelas;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updateData.updatedAt = new Date();

    const [updatedClient] = await db
      .update(masterHospitals)
      .set(updateData)
      .where(eq(masterHospitals.id, id))
      .returning();

    if (!updatedClient) {
      return NextResponse.json({ error: "Rumah Sakit tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ client: updatedClient });
  } catch (error) {
    console.error("PUT Client Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (auth.payload?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Only Admin can delete master hospitals" }, { status: 403 });
  }

  const { id } = await params;

  try {
    // Check constraints: are there users or machines referencing this hospital?
    const [userRef] = await db.select({ id: users.id }).from(users).where(eq(users.clientId, id)).limit(1);
    const [machineRef] = await db.select({ id: machines.id }).from(machines).where(eq(machines.clientId, id)).limit(1);

    if (userRef || machineRef) {
      return NextResponse.json({ error: "Tidak dapat dihapus karena masih ada User atau Mesin yang berelasi dengan Rumah Sakit ini." }, { status: 400 });
    }

    const [deletedClient] = await db
      .delete(masterHospitals)
      .where(eq(masterHospitals.id, id))
      .returning();

    if (!deletedClient) {
      return NextResponse.json({ error: "Rumah Sakit tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ message: "Rumah Sakit deleted successfully" });
  } catch (error) {
    console.error("DELETE Client Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
