import { stations } from "@/frontend/data/stations";
import type { LoggerEntry } from "@/frontend/lib/types";

const baseDate = new Date(Date.UTC(2026, 5, 26, 8, 0, 0));

export const loggerEntries: LoggerEntry[] = stations.map((station, index) => {
  const time = new Date(baseDate.getTime() + index * 10 * 60 * 1000);
  const oxygenPurity = Math.max(0, Math.min(100, station.oxygenPurity + ((index % 5) - 2) * 0.2));
  const tankPressure = Math.max(0, station.tankPressure + ((index % 3) - 1) * 0.15);
  const centralFlow = Math.max(0, station.centralFlow + ((index % 4) - 1) * 1.2);
  const boosterFlow = Math.max(0, station.boosterFlow + ((index % 3) - 1) * 0.9);
  const totalFlow = Number((centralFlow + boosterFlow).toFixed(1));

  return {
    id: `LOG-${String(index + 1).padStart(4, "0")}`,
    stationId: station.id,
    stationName: station.hospitalName,
    timestamp: time.toISOString().replace("T", " ").replace("Z", ""),
    oxygenPurity: Number(oxygenPurity.toFixed(1)),
    tankPressure: Number(tankPressure.toFixed(1)),
    centralFlow: Number(centralFlow.toFixed(1)),
    boosterFlow: Number(boosterFlow.toFixed(1)),
    totalFlow,
    status: station.status,
  };
});
