import { NextResponse } from "next/server";
import { asc, eq, isNull } from "drizzle-orm";
import { requireAuth } from "@/backend/auth/guard";
import { db } from "@/backend/db";
import { machines, masterHospitals } from "@/backend/db/schema";
import { canManageAreaMembership } from "@/backend/areas/domain";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!canManageAreaMembership(auth.payload?.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const hospitals = await db.selectDistinct({
      id: masterHospitals.id,
      hospitalName: masterHospitals.hospitalName,
    }).from(masterHospitals)
      .innerJoin(machines, eq(masterHospitals.id, machines.clientId))
      .where(isNull(machines.deletedAt))
      .orderBy(asc(masterHospitals.hospitalName));
    return NextResponse.json({ hospitals });
  } catch (error) {
    console.error("GET Area Candidates Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
