import { formatHospitalTimestamp, resolveHospitalTimeZone } from "./timezone";

function formatEventTimestamp(value: Date | string | number | null | undefined, province: string | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return formatHospitalTimestamp(value, resolveHospitalTimeZone(province).timeZone);
}

export const formatDashboardEventTimestamp = formatEventTimestamp;
export const formatHistoryEventTimestamp = formatEventTimestamp;
