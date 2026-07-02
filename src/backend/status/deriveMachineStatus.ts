import dayjs from "dayjs";
import { MachineStatus, Thresholds } from "@/shared/types";
import { getPurityLevel } from "@/backend/status/purityLevel";
import { getPressureLevel } from "@/backend/status/pressureLevel";

export function deriveMachineStatus(
  latestReadingTime: Date | null,
  purity: number | null,
  pressure: number | null,
  now: Date,
  thresholds: Thresholds
): MachineStatus {
  if (!latestReadingTime) return "offline";

  const diffMinutes = dayjs(now).diff(dayjs(latestReadingTime), "minute");
  if (diffMinutes >= thresholds.offlineAfterMinutes) {
    return "offline";
  }

  const purityLvl = purity !== null ? getPurityLevel(purity, thresholds) : "normal";
  const pressureLvl = pressure !== null ? getPressureLevel(pressure, thresholds) : "normal";

  if (purityLvl !== "normal" || pressureLvl !== "normal") {
    return "warning";
  }

  return "online";
}
