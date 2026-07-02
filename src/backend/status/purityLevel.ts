import { Level, Thresholds } from "@/shared/types";

export function getPurityLevel(purity: number, thresholds: Thresholds): Level {
  if (purity < thresholds.oxygenPurityCriticalMin) return "critical";
  if (purity < thresholds.oxygenPurityWarningMin) return "warning";
  return "normal";
}
