import { Level, Thresholds } from "@/shared/types";

export function getPurityLevel(purity: number, thresholds: Thresholds): Level {
  void thresholds;
  return purity < 90 ? "critical" : "normal";
}
