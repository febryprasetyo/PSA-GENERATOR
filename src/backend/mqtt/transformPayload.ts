import { parsePsaTopic } from "@/backend/mqtt/parsePsaTopic";

export function transformMqttPayload(topic: string, payload: Record<string, unknown>) {
  const serialNumber = parsePsaTopic(topic);
  if (!serialNumber) {
    throw new Error("Invalid topic");
  }

  const getVal = (keys: string[]) => {
    for (const k of keys) {
      if (payload[k] !== undefined && payload[k] !== null && payload[k] !== '') {
        const num = Number(payload[k]);
        if (!isNaN(num)) return num;
      }
    }
    return null;
  };

  return {
    serialNumber,
    terminalTime: payload._terminalTime ? new Date(payload._terminalTime as string | number) : new Date(),
    groupName: (payload._groupName as string) || null,
    oxygenPurity: getVal(['Schneider_PLC_OXYGEN_PURITY', 'Siemens_S7_200CN_SMART_1_O2Purity']),
    tankPressure: getVal(['Schneider_PLC_MF350_RESULT_O2_TANK', 'Siemens_S7_200CN_SMART_1_O2Tank']),
    flowSentral: getVal(['Schneider_PLC_FLOW_METER', 'Siemens_S7_200CN_SMART_1_Flow1']),
    flowBooster: getVal(['Schneider_PLC_FLOWMETER2', 'Siemens_S7_200CN_SMART_1_Flow2']),
    totalFlow: getVal(['Schneider_PLC_TOTAL_FLOW', 'TOTAL_TOTAL', 'Siemens_S7_200CN_SMART_1_AccuF1']),
    runningTimeHours: getVal(['Schneider_PLC_MF510_RUNING_TIME', 'Siemens_S7_200CN_SMART_1_RH']),
    rawPayload: payload,
  };
}
