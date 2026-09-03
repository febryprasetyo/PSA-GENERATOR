import { describe, expect, it } from "vitest";
import { transformMqttPayload } from "@/backend/mqtt/transformPayload";
import { formatHospitalTimestamp } from "@/backend/telemetry/timezone";

const topic = "data/psa/O2generatorMGM/SN1";
const receivedAt = new Date("2026-09-03T03:07:00.000Z");

describe("machine timestamp ingestion", () => {
  it("interprets offset-free machine time in the hospital timezone", () => {
    const result = transformMqttPayload(topic, { _terminalTime: "2026-09-03 11:07:00" }, {
      province: "Sulawesi Selatan",
      receivedAt,
    });

    expect(result.terminalTime.toISOString()).toBe("2026-09-03T03:07:00.000Z");
    expect(formatHospitalTimestamp(result.terminalTime, "Asia/Makassar")).toBe("03/09/2026 11:07:00");
    expect(result.timestampSource).toBe("machine");
  });

  it("uses receipt time only when machine time is unavailable", () => {
    const result = transformMqttPayload(topic, {}, { province: "Sulawesi Selatan", receivedAt });
    expect(result.terminalTime).toEqual(receivedAt);
    expect(result.timestampSource).toBe("received");
  });

  it("retains a valid machine time even when drift exceeds fifteen minutes", () => {
    const result = transformMqttPayload(topic, { _terminalTime: "2026-09-03 11:37:01" }, {
      province: "Sulawesi Selatan",
      receivedAt,
    });
    expect(result.terminalTime.toISOString()).toBe("2026-09-03T03:37:01.000Z");
    expect(result.timestampDriftMs).toBe(30 * 60_000 + 1_000);
  });
});
