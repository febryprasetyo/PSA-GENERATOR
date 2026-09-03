import { describe, expect, it } from "vitest";
import { parseNullableMetric, parseNullableMetricString } from "@/backend/telemetry/vessel";

describe("nullable Vessel formatting", () => {
  it("preserves unavailable values and numeric zero", () => {
    expect(parseNullableMetric(null)).toBeNull();
    expect(parseNullableMetric(undefined)).toBeNull();
    expect(parseNullableMetric("")).toBeNull();
    expect(parseNullableMetric("0")).toBe(0);
    expect(parseNullableMetric("1.25")).toBe(1.25);
    expect(parseNullableMetric("invalid")).toBeNull();
  });

  it("normalizes database-bound values and reports invalid input", () => {
    expect(parseNullableMetricString("0")).toEqual({ value: "0", invalid: false });
    expect(parseNullableMetricString(null)).toEqual({ value: null, invalid: false });
    expect(parseNullableMetricString("invalid")).toEqual({ value: null, invalid: true });
  });
});
