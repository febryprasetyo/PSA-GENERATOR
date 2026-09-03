import { describe, expect, it } from "vitest";
import { buildCsvHeader, formatExportTimestamp, formatNullableCsvMetric, getThirtyMinuteBucketStart, shouldIncludeMachineName } from "@/app/api/history/export/export-query";

describe("30-minute export", () => {
  it("aligns timestamps to half-hour boundaries", () => {
    expect(getThirtyMinuteBucketStart(new Date("2026-09-02T10:29:59Z")).toISOString()).toBe("2026-09-02T10:00:00.000Z");
    expect(getThirtyMinuteBucketStart(new Date("2026-09-02T10:30:00Z")).toISOString()).toBe("2026-09-02T10:30:00.000Z");
  });

  it("includes machine name only when a represented hospital owns multiple machines", () => {
    expect(shouldIncludeMachineName([1, 1])).toBe(false);
    expect(shouldIncludeMachineName([1, 2])).toBe(true);
    expect(buildCsvHeader(false)).not.toContain("Nama Mesin");
    expect(buildCsvHeader(true)).toContain("Nama Mesin");
    expect(buildCsvHeader(true)).not.toContain("Serial Number");
  });

  it("includes Vessel columns after tank pressure", () => {
    expect(buildCsvHeader(false)).toEqual([
      "No",
      "Nama Rumah Sakit",
      "Timestamp",
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

  it("formats export timestamps in hospital local time without a zone label", () => {
    expect(formatExportTimestamp(new Date("2026-09-03T03:07:00Z"), "Jawa Tengah")).toBe("03/09/2026 10:07:00");
    expect(formatExportTimestamp(new Date("2026-09-03T03:07:00Z"), "Papua Selatan")).toBe("03/09/2026 12:07:00");
    expect(buildCsvHeader(true)).toContain("Timestamp");
    expect(buildCsvHeader(true).some((cell) => /WIB|WITA|WIT|Zona/.test(cell))).toBe(false);
  });
});
