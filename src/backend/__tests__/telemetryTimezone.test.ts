import { describe, expect, it } from "vitest";
import {
  formatHospitalTimestamp,
  getLocalDateParts,
  parseMachineTimestamp,
  resolveHospitalTimeZone,
} from "@/backend/telemetry/timezone";

describe("Indonesian telemetry timezone", () => {
  it("resolves provinces across WIB, WITA, and WIT", () => {
    expect(resolveHospitalTimeZone("Jawa Tengah")).toEqual({ timeZone: "Asia/Jakarta", usedFallback: false });
    expect(resolveHospitalTimeZone("Sulawesi Selatan")).toEqual({ timeZone: "Asia/Makassar", usedFallback: false });
    expect(resolveHospitalTimeZone("Papua Selatan")).toEqual({ timeZone: "Asia/Jayapura", usedFallback: false });
    expect(resolveHospitalTimeZone("  dki JAKARTA ")).toEqual({ timeZone: "Asia/Jakarta", usedFallback: false });
    expect(resolveHospitalTimeZone("Unknown")).toEqual({ timeZone: "Asia/Jakarta", usedFallback: true });
    expect(resolveHospitalTimeZone(null)).toEqual({ timeZone: "Asia/Jakarta", usedFallback: true });
  });

  it("interprets offset-free PLC clocks in their hospital timezone", () => {
    const receivedAt = new Date("2026-09-03T03:07:00.000Z");
    const wib = parseMachineTimestamp("2026-09-03 10:07:00.000", "Asia/Jakarta", receivedAt);
    const wita = parseMachineTimestamp("2026-09-03 11:07:00.000", "Asia/Makassar", receivedAt);
    const wit = parseMachineTimestamp("2026-09-03 12:07:00.000", "Asia/Jayapura", receivedAt);

    expect(wib).toMatchObject({ source: "machine", driftMs: 0 });
    expect(wib.date.toISOString()).toBe("2026-09-03T03:07:00.000Z");
    expect(wita.date.toISOString()).toBe("2026-09-03T03:07:00.000Z");
    expect(wit.date.toISOString()).toBe("2026-09-03T03:07:00.000Z");
    expect(formatHospitalTimestamp(wita.date, "Asia/Makassar")).toBe("03/09/2026 11:07:00");
    expect(formatHospitalTimestamp(wit.date, "Asia/Jayapura")).toBe("03/09/2026 12:07:00");
  });

  it("preserves offset-aware instants regardless of hospital timezone", () => {
    const receivedAt = new Date("2026-09-03T03:07:00.000Z");
    expect(parseMachineTimestamp("2026-09-03T11:07:00+08:00", "Asia/Jakarta", receivedAt).date.toISOString()).toBe("2026-09-03T03:07:00.000Z");
    expect(parseMachineTimestamp("2026-09-03T03:07:00Z", "Asia/Jayapura", receivedAt).date.toISOString()).toBe("2026-09-03T03:07:00.000Z");
  });

  it("falls back to receipt time for missing or invalid machine time", () => {
    const receivedAt = new Date("2026-09-03T03:07:00.000Z");
    expect(parseMachineTimestamp("invalid", "Asia/Jakarta", receivedAt)).toEqual({ date: receivedAt, source: "received", driftMs: null });
    expect(parseMachineTimestamp(null, "Asia/Jakarta", receivedAt)).toEqual({ date: receivedAt, source: "received", driftMs: null });
    expect(parseMachineTimestamp("2026-02-30 10:00:00", "Asia/Jakarta", receivedAt)).toEqual({ date: receivedAt, source: "received", driftMs: null });
  });

  it("returns hospital-local parts without depending on the process timezone", () => {
    expect(getLocalDateParts(new Date("2026-09-03T03:07:08.123Z"), "Asia/Makassar")).toEqual({
      year: 2026,
      month: 9,
      day: 3,
      hour: 11,
      minute: 7,
      second: 8,
      millisecond: 123,
    });
  });
});
