import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/backend/db";
import { areaHospitals, areas, masterHospitals } from "@/backend/db/schema";
import { requireAuth } from "@/backend/auth/guard";
import { AreaValidationError, canMutateArea, normalizeAreaInput } from "@/backend/areas/domain";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!canMutateArea(auth.payload?.role) && auth.payload?.role !== "operator") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const areaRows = await db.select().from(areas).orderBy(asc(areas.name));
    const memberships = await db.select({
      areaId: areaHospitals.areaId,
      hospitalId: masterHospitals.id,
      hospitalName: masterHospitals.hospitalName,
    }).from(areaHospitals).innerJoin(masterHospitals, eq(areaHospitals.hospitalId, masterHospitals.id));
    return NextResponse.json({
      areas: areaRows.map((area) => ({
        ...area,
        hospitals: memberships.filter((item) => item.areaId === area.id),
        hospitalCount: memberships.filter((item) => item.areaId === area.id).length,
      })),
    });
  } catch (error) {
    console.error("GET Areas Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!canMutateArea(auth.payload?.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const values = normalizeAreaInput(await request.json());
    const [area] = await db.insert(areas).values(values).returning();
    return NextResponse.json({ area }, { status: 201 });
  } catch (error) {
    if (error instanceof AreaValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    if ((error as { code?: string }).code === "23505") return NextResponse.json({ error: "Nama Area sudah digunakan" }, { status: 409 });
    console.error("POST Area Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
