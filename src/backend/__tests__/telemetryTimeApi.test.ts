import { describe, expect, it } from "vitest";
import { formatDashboardEventTimestamp, formatHistoryEventTimestamp } from "@/backend/telemetry/time-api";

describe("telemetry API event timestamps", () => {
  it("formats Dashboard event time in the hospital timezone", () => {
    expect(formatDashboardEventTimestamp(new Date("2026-09-03T03:07:00Z"), "Papua Selatan")).toBe("03/09/2026 12:07:00");
  });

  it("formats History event time in the hospital timezone", () => {
    expect(formatHistoryEventTimestamp(new Date("2026-09-03T03:07:00Z"), "Jawa Tengah")).toBe("03/09/2026 10:07:00");
  });

  it("uses the WIB fallback for unknown hospital metadata", () => {
    expect(formatHistoryEventTimestamp(new Date("2026-09-03T03:07:00Z"), null)).toBe("03/09/2026 10:07:00");
  });
});
