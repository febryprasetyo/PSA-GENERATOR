import type { HealthLevel, MachineStatus, Station, StationWithMetrics } from "@/frontend/lib/types";

export function getPurityLevel(value: number): HealthLevel {
  return value < 90 ? "critical" : "normal";
}

export function getPressureLevel(value: number): HealthLevel {
  if (value < 4) return "critical";
  if (value > 8) return "warning";
  return "normal";
}

export function getUtilizationLevel(value: number): HealthLevel {
  if (value > 100) return "critical";
  if (value >= 85 || value < 30) return "warning";
  return "normal";
}

export function statusLabel(status: MachineStatus) {
  return {
    online: "Menyala",
    offline: "Mati",
    warning: "Warning",
  }[status];
}

export function enrichStation(station: Station): StationWithMetrics {
  const centralFlow = station.centralFlow || 0;
  const boosterFlow = station.boosterFlow || 0;
  const rawTotalFlow = station.totalFlow || 0;
  const runningTime = station.runningTimeHours || 0;
  
  const totalFlow = rawTotalFlow > 0 ? rawTotalFlow : centralFlow + boosterFlow;
  
  const capacityMcDay = station.capacityMcDay || 0;
  const utilization = capacityMcDay > 0 ? (totalFlow / capacityMcDay) * 100 : 0;
  
  const purityLevel = getPurityLevel(station.oxygenPurity || 0);
  const pressureLevel = getPressureLevel(station.tankPressure || 0);

  let healthScore = station.status === "offline" ? 0 : 100;
  if (station.status === "warning") healthScore -= 20;
  if (purityLevel === "critical") healthScore -= 40;
  if (pressureLevel !== "normal") healthScore -= 25;

  const boundedScore = Math.max(0, Math.min(100, Math.round(healthScore)));
  const healthLevel: HealthLevel =
    boundedScore < 60
      ? "critical"
      : boundedScore < 80
        ? "warning"
        : "normal";

  return {
    ...station,
    actualDailyFlow: station.actualDailyFlow || 0,
    centralFlow,
    boosterFlow,
    oxygenPurity: station.oxygenPurity || 0,
    tankPressure: station.tankPressure || 0,
    runningTimeHours: runningTime,
    totalFlow: Number(totalFlow.toFixed(1)),
    utilization: Number(utilization.toFixed(1)),
    purityLevel,
    pressureLevel,
    healthLevel,
    healthScore: boundedScore,
  };
}

export function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}
