import { db } from "@/backend/db";
import { areaHospitals, areas, masterHospitals } from "@/backend/db/schema";
import { AreaNotFoundError, AreaValidationError, normalizeHospitalIds } from "./domain";
import { eq, inArray } from "drizzle-orm";

export async function replaceAreaHospitals(areaId: string, input: unknown): Promise<void> {
  const hospitalIds = normalizeHospitalIds(input);
  await db.transaction(async (tx) => {
    const [area] = await tx.select({ id: areas.id }).from(areas).where(eq(areas.id, areaId)).limit(1);
    if (!area) throw new AreaNotFoundError("Area tidak ditemukan");

    const found = hospitalIds.length
      ? await tx.select({ id: masterHospitals.id }).from(masterHospitals).where(inArray(masterHospitals.id, hospitalIds))
      : [];
    if (found.length !== hospitalIds.length) throw new AreaValidationError("Rumah Sakit tidak valid");

    if (hospitalIds.length) await tx.delete(areaHospitals).where(inArray(areaHospitals.hospitalId, hospitalIds));
    await tx.delete(areaHospitals).where(eq(areaHospitals.areaId, areaId));
    if (hospitalIds.length) {
      await tx.insert(areaHospitals).values(hospitalIds.map((hospitalId) => ({ areaId, hospitalId })));
    }
  });
}
