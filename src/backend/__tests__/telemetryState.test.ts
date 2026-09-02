import { describe, expect, it } from "vitest";
import { calculateActualDailyFlow, resolveDailyBaseline, resolveHeartbeatStatus } from "@/backend/telemetry/state";

describe("telemetry state", () => {
  it("uses the same five-minute heartbeat boundary for machine lists and dashboard", () => {
    const now = new Date("2026-09-02T07:10:00Z");
    expect(resolveHeartbeatStatus("2026-09-02T07:06:00Z", "online", now)).toBe("online");
    expect(resolveHeartbeatStatus("2026-09-02T07:05:00Z", "online", now)).toBe("offline");
  });

  it("preserves a baseline whose database timestamp is on the same UTC day", () => {
    expect(resolveDailyBaseline(100, "2026-09-02T00:00:00.000Z", 125, new Date("2026-09-02T07:00:00Z")))
      .toEqual({ value: 100, date: "2026-09-02" });
  });

  it("calculates actual daily flow from the preserved baseline", () => {
    expect(calculateActualDailyFlow(125, 100)).toBe(25);
  });
});
