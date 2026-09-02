import { NextResponse } from "next/server";
import { requireAuth } from "@/backend/auth/guard";
import { replaceAreaHospitals } from "@/backend/areas/membership";
import { AreaNotFoundError, AreaValidationError, canManageAreaMembership } from "@/backend/areas/domain";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!canManageAreaMembership(auth.payload?.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { id } = await params;
    const body = await request.json();
    await replaceAreaHospitals(id, body?.hospitalIds);
    return NextResponse.json({ message: "Anggota Area berhasil diperbarui" });
  } catch (error) {
    if (error instanceof AreaNotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
    if (error instanceof AreaValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("PUT Area Hospitals Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
