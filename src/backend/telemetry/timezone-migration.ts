import { getLocalDateParts, parseMachineTimestamp, resolveHospitalTimeZone } from "./timezone";

export type TimestampMigrationRow = {
  currentTerminalTime: Date;
  rawPayload: unknown;
  province: string | null;
  receivedAt: Date;
};

export type TimestampMigrationPlan = {
  desiredTerminalTime: Date;
  changed: boolean;
};

function rawTerminalTime(rawPayload: unknown): unknown {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) return undefined;
  return (rawPayload as Record<string, unknown>)._terminalTime;
}

function floorTenMinutes(value: Date): Date {
  const copy = new Date(value);
  copy.setUTCMinutes(Math.floor(copy.getUTCMinutes() / 10) * 10, 0, 0);
  return copy;
}

export function planTelemetryTimestamp(
  row: TimestampMigrationRow,
  table: "latest" | "history",
): TimestampMigrationPlan | null {
  const timeZone = resolveHospitalTimeZone(row.province).timeZone;
  const parsed = parseMachineTimestamp(rawTerminalTime(row.rawPayload), timeZone, row.receivedAt);
  if (parsed.source !== "machine") return null;

  // Indonesian zones differ by whole hours, so UTC and hospital-local 10-minute
  // boundaries are identical. Reading the local parts documents that invariant.
  getLocalDateParts(parsed.date, timeZone);
  const desiredTerminalTime = table === "history" ? floorTenMinutes(parsed.date) : parsed.date;
  return {
    desiredTerminalTime,
    changed: desiredTerminalTime.getTime() !== row.currentTerminalTime.getTime(),
  };
}
