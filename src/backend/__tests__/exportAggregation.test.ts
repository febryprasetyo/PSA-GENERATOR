import { describe, expect, it } from "vitest";
import { buildCsvHeader, formatNullableCsvMetric, getThirtyMinuteBucketStart, shouldIncludeSerialNumber } from "@/app/api/history/export/export-query";

describe("30-minute export", () => {
  it("aligns timestamps to half-hour boundaries", () => {
    expect(getThirtyMinuteBucketStart(new Date("2026-09-02T10:29:59Z")).toISOString()).toBe("2026-09-02T10:00:00.000Z");
    expect(getThirtyMinuteBucketStart(new Date("2026-09-02T10:30:00Z")).toISOString()).toBe("2026-09-02T10:30:00.000Z");
  });

  it("includes SN only when a represented hospital owns multiple machines", () => {
    expect(shouldIncludeSerialNumber([1, 1])).toBe(false);
    expect(shouldIncludeSerialNumber([1, 2])).toBe(true);
    expect(buildCsvHeader(false)).not.toContain("Serial Number");
    expect(buildCsvHeader(true)).toContain("Serial Number");
  });

  it("includes Vessel columns after tank pressure", () => {
    expect(buildCsvHeader(false)).toEqual([
      "No",
      "Nama Rumah Sakit",
      "Interval Mulai (30 Menit)",
      "Oxygen Purity (%)",
      "Tank Pressure (bar)",
      "Vessel 1 (MPa)",
      "Vessel 2 (MPa)",
      "Flow Meter Sentral (Nm³/h)",
      "Flow Meter Booster (Nm³/h)",
      "Total Flow (Nm³/h)",
      "Running Time (Jam)",
    ]);
  });

  it("exports missing Vessel values as empty cells and preserves zero", () => {
    expect(formatNullableCsvMetric(null)).toBe("");
    expect(formatNullableCsvMetric(undefined)).toBe("");
    expect(formatNullableCsvMetric("invalid")).toBe("");
    expect(formatNullableCsvMetric(0)).toBe("0.00");
    expect(formatNullableCsvMetric("1.25")).toBe("1.25");
  });
});
