import { describe, expect, it } from "vitest";
import { averageSamples, getTenMinuteBucketStart } from "@/backend/mqtt/intervalAggregation";

describe("ten-minute aggregation", () => {
  it("aligns timestamps to UTC ten-minute boundaries", () => {
    expect(getTenMinuteBucketStart(new Date("2026-09-02T10:19:59.999Z")).toISOString()).toBe("2026-09-02T10:10:00.000Z");
    expect(getTenMinuteBucketStart(new Date("2026-09-02T10:20:00.000Z")).toISOString()).toBe("2026-09-02T10:20:00.000Z");
  });

  it("averages finite metrics and keeps latest metadata", () => {
    const reading = averageSamples([
      { machineId: "m-1", clientId: "h-1", serialNumber: "SN1", terminalTime: "2026-09-02T10:11:00Z", oxygenPurity: "90", totalFlow: "100", mqttTopic: "old", rawPayload: { sample: 1 } },
      { machineId: "m-1", clientId: "h-1", serialNumber: "SN1", terminalTime: "2026-09-02T10:19:00Z", oxygenPurity: "100", totalFlow: "110", mqttTopic: "new", rawPayload: { sample: 2 } },
      { machineId: "m-1", clientId: "h-1", serialNumber: "SN1", terminalTime: "2026-09-02T10:18:00Z", oxygenPurity: null, totalFlow: "", mqttTopic: "ignored-null" },
    ], new Date("2026-09-02T10:10:00Z"));
    expect(reading).toMatchObject({ oxygenPurity: "95.00", totalFlow: "105.00", mqttTopic: "new", rawPayload: { sample: 2 } });
    expect(reading.terminalTime.toISOString()).toBe("2026-09-02T10:10:00.000Z");
  });
});
