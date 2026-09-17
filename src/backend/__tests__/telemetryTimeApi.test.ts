import { describe, expect, it } from "vitest";
import { formatDashboardEventTimestamp, formatDashboardMachineEventTimestamp, formatHistoryReceiptTimestamp } from "@/backend/telemetry/time-api";

describe("telemetry API event timestamps", () => {
  it("formats Dashboard event time in the hospital timezone", () => {
    expect(formatDashboardEventTimestamp(new Date("2026-09-03T03:07:00Z"), "Papua Selatan")).toBe("03/09/2026 12:07:00");
  });

  it("formats History receipt time in the hospital timezone", () => {
    expect(formatHistoryReceiptTimestamp(new Date("2026-09-03T03:07:00Z"), "Jawa Tengah")).toBe("03/09/2026 10:07:00");
  });

  it("uses the WIB fallback for unknown hospital metadata", () => {
    expect(formatHistoryReceiptTimestamp(new Date("2026-09-03T03:07:00Z"), null)).toBe("03/09/2026 10:07:00");
  });

  it("prefers the immutable raw machine clock over a legacy Redis instant", () => {
    expect(formatDashboardMachineEventTimestamp(
      { _terminalTime: "2026-09-03 11:50:25.209" },
      "2026-09-03T11:50:25.209Z",
      "Jawa Tengah",
    )).toBe("03/09/2026 11:50:25");
  });
});
