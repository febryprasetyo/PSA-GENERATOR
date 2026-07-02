import { Level, MachineStatus } from "@/shared/types";

export interface DashboardMachine {
  serialNumber: string;
  status: MachineStatus;
  purityLevel: Level;
  oxygenPurity: number | null;
}

export function getOxygenQualityIssues(machines: DashboardMachine[]): DashboardMachine[] {
  return machines
    .filter((m) => m.status !== "offline")
    .filter((m) => m.purityLevel !== "normal")
    .sort((a, b) => {
      const purityA = a.oxygenPurity ?? Infinity;
      const purityB = b.oxygenPurity ?? Infinity;
      return purityA - purityB;
    });
}
