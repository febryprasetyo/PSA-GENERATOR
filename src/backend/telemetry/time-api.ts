import { formatHospitalTimestamp, parseMachineTimestamp, resolveHospitalTimeZone } from "./timezone";

function formatEventTimestamp(value: Date | string | number | null | undefined, province: string | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return formatHospitalTimestamp(value, resolveHospitalTimeZone(province).timeZone);
}

export const formatDashboardEventTimestamp = formatEventTimestamp;
export const formatHistoryEventTimestamp = formatEventTimestamp;

export function formatDashboardMachineEventTimestamp(
  rawPayload: unknown,
  storedValue: Date | string | number | null | undefined,
  province: string | null | undefined,
): string {
  const rawValue = rawPayload && typeof rawPayload === "object" && !Array.isArray(rawPayload)
    ? (rawPayload as Record<string, unknown>)._terminalTime
    : undefined;
  const timeZone = resolveHospitalTimeZone(province).timeZone;
  const storedDate = storedValue === null || storedValue === undefined ? new Date(0) : new Date(storedValue);
  const parsed = parseMachineTimestamp(rawValue, timeZone, storedDate);
  return parsed.source === "machine"
    ? formatHospitalTimestamp(parsed.date, timeZone)
    : formatEventTimestamp(storedValue, province);
}
