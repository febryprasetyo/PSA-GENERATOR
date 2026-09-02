import { describe, expect, it } from "vitest";
import { canShowMachineSync } from "@/frontend/lib/machine-sync";

describe("machine sync visibility", () => {
  it("shows manual MQTT sync to admin independently of auto-register", () => {
    expect(canShowMachineSync("admin")).toBe(true);
    expect(canShowMachineSync("operator")).toBe(false);
  });
});
