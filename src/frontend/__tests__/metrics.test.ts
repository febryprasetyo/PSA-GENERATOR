import { describe, expect, it } from "vitest";
import { enrichStation } from "@/frontend/lib/metrics";
import type { Station } from "@/frontend/lib/types";

const station = (overrides: Partial<Station> = {}): Station => ({
  id: "SN-1",
  hospitalName: "RS Test",
  centralFlow: 10,
  boosterFlow: 0,
  oxygenPurity: 95,
  tankPressure: 5,
  totalFlow: 10,
  runningTimeHours: 1,
  status: "online",
  lastUpdate: "2026-09-02T07:00:00Z",
  region: "Test",
  ...overrides,
});

describe("station health", () => {
  it("does not penalize an online healthy machine when capacity is empty", () => {
    expect(enrichStation(station({ capacityMcDay: 0 })).healthScore).toBe(100);
  });

  it("assigns zero critical health to an offline machine", () => {
    const result = enrichStation(station({ status: "offline" }));
    expect(result.healthScore).toBe(0);
    expect(result.healthLevel).toBe("critical");
  });

  it("applies the approved purity and pressure deductions", () => {
    const result = enrichStation(station({ oxygenPurity: 89, tankPressure: 3.5 }));
    expect(result.healthScore).toBe(35);
    expect(result.healthLevel).toBe("critical");
  });
});
