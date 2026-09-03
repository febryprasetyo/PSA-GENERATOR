import { describe, expect, it } from "vitest";
import { parseNullableMetric } from "@/backend/telemetry/vessel";

describe("nullable Vessel formatting", () => {
  it("preserves unavailable values and numeric zero", () => {
    expect(parseNullableMetric(null)).toBeNull();
    expect(parseNullableMetric(undefined)).toBeNull();
    expect(parseNullableMetric("")).toBeNull();
    expect(parseNullableMetric("0")).toBe(0);
    expect(parseNullableMetric("1.25")).toBe(1.25);
    expect(parseNullableMetric("invalid")).toBeNull();
  });
});
