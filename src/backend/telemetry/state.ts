import type { MachineStatus } from "@/shared/types";

const utcDate = (value: string | Date) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

export function resolveHeartbeatStatus(
  latestReadingTime: string | Date | null | undefined,
  storedStatus: string,
  now = new Date(),
  offlineAfterMinutes = 5,
): MachineStatus {
  if (!latestReadingTime) return "offline";
  const latest = new Date(latestReadingTime);
  if (Number.isNaN(latest.getTime()) || now.getTime() - latest.getTime() >= offlineAfterMinutes * 60_000) {
    return "offline";
  }
  return storedStatus === "warning" ? "warning" : "online";
}

export function resolveDailyBaseline(
  previousValue: number | string | null | undefined,
  previousDate: string | Date | null | undefined,
  currentValue: number,
  now = new Date(),
) {
  const date = utcDate(now) as string;
  const sameDay = previousDate ? utcDate(previousDate) === date : false;
  const parsedPrevious = Number(previousValue);
  return {
    value: sameDay && Number.isFinite(parsedPrevious) ? parsedPrevious : currentValue,
    date,
  };
}

export function calculateActualDailyFlow(totalFlow: number, baseline: number) {
  return Math.max(0, totalFlow - baseline);
}
