import { describe, expect, it } from "vitest";
import { planTelemetryTimestamp } from "@/backend/telemetry/timezone-migration";

const receivedAt = new Date("2026-09-03T03:07:00.000Z");

describe("telemetry timestamp migration planning", () => {
  it.each([
    ["Jawa Tengah", "2026-09-03 10:07:00", "2026-09-03T03:07:00.000Z"],
    ["Sulawesi Selatan", "2026-09-03 11:07:00", "2026-09-03T03:07:00.000Z"],
    ["Papua Selatan", "2026-09-03 12:07:00", "2026-09-03T03:07:00.000Z"],
  ])("preserves the %s machine wall clock", (province, rawTime, expected) => {
    const result = planTelemetryTimestamp({
      currentTerminalTime: new Date("2026-09-03T10:07:00.000Z"),
      rawPayload: { _terminalTime: rawTime },
      province,
      receivedAt,
    }, "latest");

    expect(result?.desiredTerminalTime.toISOString()).toBe(expected);
    expect(result).not.toHaveProperty("receivedAt");
  });

  it("floors historical machine time to its 10-minute bucket", () => {
    const result = planTelemetryTimestamp({
      currentTerminalTime: new Date("2026-09-03T03:00:00.000Z"),
      rawPayload: { _terminalTime: "2026-09-03 11:17:42" },
      province: "Sulawesi Selatan",
      receivedAt,
    }, "history");

    expect(result?.desiredTerminalTime.toISOString()).toBe("2026-09-03T03:10:00.000Z");
  });

  it("skips invalid or missing immutable raw machine time", () => {
    const base = { currentTerminalTime: receivedAt, province: "Jawa Tengah", receivedAt };
    expect(planTelemetryTimestamp({ ...base, rawPayload: {} }, "latest")).toBeNull();
    expect(planTelemetryTimestamp({ ...base, rawPayload: { _terminalTime: "invalid" } }, "latest")).toBeNull();
  });

  it("is idempotent on a second pass", () => {
    const row = {
      currentTerminalTime: new Date("2026-09-03T10:07:00.000Z"),
      rawPayload: { _terminalTime: "2026-09-03 12:07:00" },
      province: "Papua Selatan",
      receivedAt,
    };
    const first = planTelemetryTimestamp(row, "latest");
    expect(first?.changed).toBe(true);
    const second = planTelemetryTimestamp({ ...row, currentTerminalTime: first!.desiredTerminalTime }, "latest");
    expect(second?.changed).toBe(false);
    expect(second?.desiredTerminalTime).toEqual(first?.desiredTerminalTime);
  });
});
