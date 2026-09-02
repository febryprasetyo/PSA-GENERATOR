import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/backend/db";
import { areas } from "@/backend/db/schema";
import { requireAuth } from "@/backend/auth/guard";
import { AreaValidationError, canMutateArea, normalizeAreaInput } from "@/backend/areas/domain";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  const auth = await requireAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!canMutateArea(auth.payload?.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { id } = await params;
    const values = normalizeAreaInput(await request.json());
    const [area] = await db.update(areas).set({ ...values, updatedAt: new Date() }).where(eq(areas.id, id)).returning();
    if (!area) return NextResponse.json({ error: "Area tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ area });
  } catch (error) {
    if (error instanceof AreaValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    if ((error as { code?: string }).code === "23505") return NextResponse.json({ error: "Nama Area sudah digunakan" }, { status: 409 });
    console.error("PUT Area Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const auth = await requireAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!canMutateArea(auth.payload?.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { id } = await params;
    const [area] = await db.delete(areas).where(eq(areas.id, id)).returning({ id: areas.id });
    if (!area) return NextResponse.json({ error: "Area tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ message: "Area berhasil dihapus" });
  } catch (error) {
    console.error("DELETE Area Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
