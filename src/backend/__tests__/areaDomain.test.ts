import { describe, expect, it } from "vitest";
import {
  canManageAreaMembership,
  canMutateArea,
  normalizeAreaInput,
  normalizeHospitalIds,
} from "@/backend/areas/domain";

describe("Area domain", () => {
  it("trims valid Area metadata", () => {
    expect(normalizeAreaInput({ name: "  Area 1 ", description: " Barat " })).toEqual({
      name: "Area 1",
      description: "Barat",
    });
  });

  it("rejects blank Area names", () => {
    expect(() => normalizeAreaInput({ name: "   " })).toThrow("Nama Area wajib diisi");
  });

  it("deduplicates hospital IDs", () => {
    expect(normalizeHospitalIds(["h-1", "h-1", "h-2"])).toEqual(["h-1", "h-2"]);
  });

  it("applies Area role permissions", () => {
    expect(canMutateArea("admin")).toBe(true);
    expect(canMutateArea("operator")).toBe(false);
    expect(canManageAreaMembership("admin")).toBe(true);
    expect(canManageAreaMembership("operator")).toBe(true);
    expect(canManageAreaMembership("client")).toBe(false);
  });
});
