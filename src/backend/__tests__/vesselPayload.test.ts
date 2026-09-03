import { describe, expect, it } from "vitest";
import { transformMqttPayload } from "@/backend/mqtt/transformPayload";

describe("Vessel MQTT payload", () => {
  it("parses valid Vessel values including zero", () => {
    expect(transformMqttPayload("data/psa/O2generatorMGM/SN1", {
      Schneider_PLC_VESSEL1: "1.25",
      Schneider_PLC_VESSEL2: "0",
    })).toMatchObject({ vessel1: 1.25, vessel2: 0 });
  });

  it("keeps invalid and missing Vessel values unavailable", () => {
    expect(transformMqttPayload("data/psa/O2generatorMGM/SN1", {
      Schneider_PLC_VESSEL1: "invalid",
    })).toMatchObject({ vessel1: null, vessel2: null });
  });
});
