import { Level, Thresholds } from "@/shared/types";

export function getPressureLevel(pressure: number, thresholds: Thresholds): Level {
  if (pressure < thresholds.tankPressureWarningMin) return "critical";
  if (pressure > thresholds.tankPressureWarningMax) return "warning";
  return "normal";
}
