import { dashboardColors } from "@/frontend/lib/colors";
import type { DashboardSummary, OxygenQualitySummary, StationFilters, StatusChartItem } from "@/frontend/lib/dashboard-types";
import type { StationWithMetrics } from "@/frontend/lib/types";

export function getDashboardSummary(stations: StationWithMetrics[]): DashboardSummary {
  const totalMachines = stations.reduce((sum, station) => sum + station.machineCount, 0);
  const onlineMachines = stations.filter((station) => station.status === "online").reduce((sum, station) => sum + station.machineCount, 0);
  const offlineMachines = stations.filter((station) => station.status === "offline").reduce((sum, station) => sum + station.machineCount, 0);
  const totalCapacity = stations.reduce((sum, station) => sum + station.capacityMcDay, 0);
  const totalFlow = stations.reduce((sum, station) => sum + station.totalFlow, 0);
  const totalActualDailyFlow = stations.reduce((sum, station) => sum + (station.actualDailyFlow || 0), 0);
  const activeStations = getActiveStations(stations);
  const averagePurity = getAveragePurity(activeStations);
  const criticalSites = stations.filter((station) => station.healthLevel === "critical").length;
  const warningSites = stations.filter((station) => station.healthLevel === "warning").length;

  return {
    totalMachines,
    totalStations: stations.length,
    onlineMachines,
    offlineMachines,
    totalCapacity,
    totalFlow,
    totalActualDailyFlow,
    averagePurity,
    criticalSites,
    warningSites,
    availability: totalMachines > 0 ? (onlineMachines / totalMachines) * 100 : 0,
    utilization: totalCapacity > 0 ? (totalFlow / totalCapacity) * 100 : 0,
  };
}

export function getActiveStations(stations: StationWithMetrics[]) {
  return stations.filter((station) => station.status !== "offline");
}

export function getAveragePurity(stations: StationWithMetrics[]) {
  if (stations.length === 0) {
    return 0;
  }

  return stations.reduce((sum, station) => sum + station.oxygenPurity, 0) / stations.length;
}

export function getOxygenQualityIssues(stations: StationWithMetrics[]) {
  return [...stations]
    .filter((station) => station.status !== "offline" && station.purityLevel !== "normal")
    .sort((a, b) => a.oxygenPurity - b.oxygenPurity || a.healthScore - b.healthScore);
}

export function getOxygenQualitySummary(stations: StationWithMetrics[], oxygenQualityIssues: StationWithMetrics[]): OxygenQualitySummary {
  const activeStations = getActiveStations(stations);

  return {
    active: activeStations.length,
    critical: oxygenQualityIssues.filter((station) => station.purityLevel === "critical").length,
    warning: oxygenQualityIssues.filter((station) => station.purityLevel === "warning").length,
    averageActivePurity: getAveragePurity(activeStations),
  };
}

export function getFilteredStations(stations: StationWithMetrics[], filters: StationFilters) {
  const normalizedQuery = filters.query.trim().toLowerCase();

  return [...stations]
    .filter((station) => station.hospitalName.toLowerCase().includes(normalizedQuery) || station.id.toLowerCase().includes(normalizedQuery))
    .filter((station) => filters.statusFilter === "all" || station.status === filters.statusFilter)
    .filter((station) => filters.purityFilter === "all" || station.purityLevel === filters.purityFilter)
    .filter((station) => filters.pressureFilter === "all" || station.pressureLevel === filters.pressureFilter)
    .sort((a, b) => {
      const left = a[filters.sortKey];
      const right = b[filters.sortKey];

      if (typeof left === "number" && typeof right === "number") {
        return filters.sortDirection === "asc" ? left - right : right - left;
      }

      return filters.sortDirection === "asc" ? String(left).localeCompare(String(right)) : String(right).localeCompare(String(left));
    });
}

export function getStatusChart(stations: StationWithMetrics[]): StatusChartItem[] {
  return [
    { name: "Menyala", value: stations.filter((station) => station.status === "online").length, color: dashboardColors.online },
    { name: "Mati", value: stations.filter((station) => station.status === "offline").length, color: dashboardColors.offline },
    { name: "Warning", value: stations.filter((station) => station.status === "warning").length, color: dashboardColors.warning },
  ];
}
