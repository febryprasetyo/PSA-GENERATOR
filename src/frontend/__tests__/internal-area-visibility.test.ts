import { describe, expect, it } from "vitest";
import { canViewInternalArea } from "@/frontend/lib/role-profiles";

describe("internal Area visibility", () => {
  it("keeps Area available to internal roles only", () => {
    expect(canViewInternalArea("admin")).toBe(true);
    expect(canViewInternalArea("operator")).toBe(true);
    expect(canViewInternalArea("client")).toBe(false);
    expect(canViewInternalArea("viewer")).toBe(false);
  });
});
