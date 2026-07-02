import type { HealthLevel, MachineStatus } from "@/frontend/lib/types";

export type SortKey = "hospitalName" | "capacityMcDay" | "totalFlow" | "oxygenPurity" | "tankPressure" | "status" | "healthScore" | "lastUpdate";
export type SortDirection = "asc" | "desc";
export type StatusFilter = "all" | MachineStatus;
export type HealthFilter = "all" | HealthLevel;

export type DashboardSummary = {
  totalMachines: number;
  totalStations: number;
  onlineMachines: number;
  offlineMachines: number;
  totalCapacity: number;
  totalFlow: number;
  totalActualDailyFlow: number;
  averagePurity: number;
  criticalSites: number;
  warningSites: number;
  availability: number;
  utilization: number;
};

export type OxygenQualitySummary = {
  active: number;
  critical: number;
  warning: number;
  averageActivePurity: number;
};

export type StationFilters = {
  query: string;
  statusFilter: StatusFilter;
  purityFilter: HealthFilter;
  pressureFilter: HealthFilter;
  sortKey: SortKey;
  sortDirection: SortDirection;
};

export type StatusChartItem = {
  name: string;
  value: number;
  color: string;
};
