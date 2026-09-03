import { formatHospitalTimestamp, resolveHospitalTimeZone } from "@/backend/telemetry/timezone";

export function getThirtyMinuteBucketStart(date: Date): Date {
  const value = new Date(date);
  value.setUTCMinutes(value.getUTCMinutes() < 30 ? 0 : 30, 0, 0);
  return value;
}

export function shouldIncludeMachineName(machineCounts: number[]): boolean {
  return machineCounts.some((count) => count > 1);
}

export function formatNullableCsvMetric(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : "";
}

export function formatExportTimestamp(value: Date | string | number, province: string | null | undefined): string {
  return formatHospitalTimestamp(value, resolveHospitalTimeZone(province).timeZone);
}

export function buildCsvHeader(includeMachineName: boolean): string[] {
  return [
    "No",
    ...(includeMachineName ? ["Nama Mesin"] : []),
    "Nama Rumah Sakit",
    "Timestamp",
    "Oxygen Purity (%)",
    "Tank Pressure (bar)",
    "Vessel 1 (MPa)",
    "Vessel 2 (MPa)",
    "Flow Meter Sentral (Nm³/h)",
    "Flow Meter Booster (Nm³/h)",
    "Total Flow (Nm³/h)",
    "Running Time (Jam)",
  ];
}
