import type { UserRole } from "@/shared/types";

export class AreaValidationError extends Error {}
export class AreaNotFoundError extends Error {}

export function normalizeAreaInput(body: unknown) {
  if (!body || typeof body !== "object") throw new AreaValidationError("Nama Area wajib diisi");
  const value = body as Record<string, unknown>;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) throw new AreaValidationError("Nama Area wajib diisi");
  if (name.length > 150) throw new AreaValidationError("Nama Area maksimal 150 karakter");
  const description = typeof value.description === "string" ? value.description.trim() || null : null;
  return { name, description };
}

export function normalizeHospitalIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((id) => typeof id !== "string" || !id.trim())) {
    throw new AreaValidationError("Daftar Rumah Sakit tidak valid");
  }
  return [...new Set(value.map((id) => id.trim()))];
}

export const canMutateArea = (role?: string): role is UserRole => role === "admin";
export const canManageAreaMembership = (role?: string): role is UserRole => role === "admin" || role === "operator";
