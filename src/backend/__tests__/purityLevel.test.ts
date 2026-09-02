import { describe, expect, it } from "vitest";
import { getPurityLevel } from "@/backend/status/purityLevel";
import type { Thresholds } from "@/shared/types";

const thresholds: Thresholds = {
  oxygenPurityWarningMin: 93,
  oxygenPurityCriticalMin: 90,
  tankPressureWarningMin: 4,
  tankPressureWarningMax: 8,
  offlineAfterMinutes: 5,
};

describe("purity classification", () => {
  it.each([[89.99, "critical"], [90, "normal"], [90.01, "normal"]] as const)(
    "maps %s to %s",
    (purity, expected) => expect(getPurityLevel(purity, thresholds)).toBe(expected),
  );
});
