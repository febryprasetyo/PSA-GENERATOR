export type BufferedSample = {
  machineId: string;
  clientId: string | null;
  serialNumber: string;
  terminalTime: string;
  groupName?: string | null;
  oxygenPurity?: string | null;
  tankPressure?: string | null;
  vessel1?: string | null;
  vessel2?: string | null;
  flowSentral?: string | null;
  flowBooster?: string | null;
  totalFlow?: string | null;
  runningTimeHours?: string | null;
  mqttTopic?: string | null;
  rawPayload?: unknown;
};

const metricKeys = ["oxygenPurity", "tankPressure", "vessel1", "vessel2", "flowSentral", "flowBooster", "totalFlow", "runningTimeHours"] as const;

export function getTenMinuteBucketStart(date: Date): Date {
  const value = new Date(date);
  value.setUTCMinutes(Math.floor(value.getUTCMinutes() / 10) * 10, 0, 0);
  return value;
}

export function averageSamples(samples: BufferedSample[], bucketStart: Date) {
  if (!samples.length) throw new Error("Tidak ada sampel untuk diagregasi");
  const latest = [...samples].sort((left, right) => Date.parse(left.terminalTime) - Date.parse(right.terminalTime)).at(-1)!;
  const metrics = Object.fromEntries(metricKeys.map((key) => {
    const values = samples
      .map((sample) => sample[key])
      .filter((value): value is string => value !== null && value !== undefined && value !== "")
      .map(Number)
      .filter(Number.isFinite);
    return [key, values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2) : null];
  }));
  return {
    machineId: latest.machineId,
    clientId: latest.clientId,
    serialNumber: latest.serialNumber,
    terminalTime: bucketStart,
    receivedAt: new Date(),
    groupName: latest.groupName || null,
    ...metrics,
    mqttTopic: latest.mqttTopic || null,
    rawPayload: latest.rawPayload,
  };
}
