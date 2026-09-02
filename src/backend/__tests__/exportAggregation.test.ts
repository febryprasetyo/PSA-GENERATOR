import { describe, expect, it } from "vitest";
import { buildCsvHeader, getThirtyMinuteBucketStart, shouldIncludeSerialNumber } from "@/app/api/history/export/export-query";

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
});
