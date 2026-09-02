export function resolveHospitalScope(
  role: string | undefined,
  assignedHospitalId: string | null | undefined,
  requestedHospitalId: string | null | undefined,
) {
  if (role === "client") {
    return assignedHospitalId
      ? { hospitalId: assignedHospitalId, allowed: true }
      : { hospitalId: null, allowed: false };
  }

  return { hospitalId: requestedHospitalId || null, allowed: true };
}
