import { describe, it, expect } from 'vitest';
import { getDashboardSummary, getActiveStations, getAveragePurity, getOxygenQualitySummary, getOxygenQualityIssues } from '@/frontend/lib/dashboard-analytics';
import type { StationWithMetrics } from '@/frontend/lib/types';

// Mock data for testing
const mockStations: StationWithMetrics[] = [
  {
    id: "ST-1",
    hospitalName: "RS Pusat",
    status: "online",
    oxygenPurity: 95.5,
    purityLevel: "normal",
    tankPressure: 4.5,
    pressureLevel: "normal",
    healthScore: 95,
    healthLevel: "normal",
    machineCount: 2,
    capacityMcDay: 100,
    totalFlow: 80,
    actualDailyFlow: 75,
    centralFlow: 10,
    boosterFlow: 5,
    runningTimeHours: 100,
    region: 'Jawa',
    lastUpdate: '2026-07-01T00:00:00Z',
    utilization: 80,
  },
  {
    id: "ST-2",
    hospitalName: "RS Daerah",
    status: "online",
    oxygenPurity: 92.0,
    purityLevel: "warning",
    tankPressure: 4.0,
    pressureLevel: "normal",
    healthScore: 80,
    healthLevel: "warning",
    machineCount: 1,
    capacityMcDay: 50,
    totalFlow: 40,
    actualDailyFlow: 35,
    centralFlow: 10,
    boosterFlow: 5,
    runningTimeHours: 100,
    region: 'Jawa',
    lastUpdate: '2026-07-01T00:00:00Z',
    utilization: 80,
  },
  {
    id: "ST-3",
    hospitalName: "RS Kota",
    status: "offline",
    oxygenPurity: 0,
    purityLevel: "critical",
    tankPressure: 0,
    pressureLevel: "critical",
    healthScore: 0,
    healthLevel: "critical",
    machineCount: 1,
    capacityMcDay: 50,
    totalFlow: 0,
    actualDailyFlow: 0,
    centralFlow: 0,
    boosterFlow: 0,
    runningTimeHours: 100,
    region: 'Jawa',
    lastUpdate: '2026-07-01T00:00:00Z',
    utilization: 0,
  }
];

describe('Dashboard Analytics Functions', () => {
  it('getActiveStations should filter out offline stations', () => {
    const active = getActiveStations(mockStations);
    expect(active.length).toBe(2);
    expect(active.every(s => s.status !== 'offline')).toBe(true);
  });

  it('getAveragePurity should calculate correct average for active stations', () => {
    const active = getActiveStations(mockStations);
    const avg = getAveragePurity(active);
    expect(avg).toBe((95.5 + 92.0) / 2); // 93.75
  });

  it('getAveragePurity should return 0 if no stations', () => {
    expect(getAveragePurity([])).toBe(0);
  });

  it('getDashboardSummary should aggregate correctly', () => {
    const summary = getDashboardSummary(mockStations);
    
    expect(summary.totalStations).toBe(3);
    expect(summary.totalMachines).toBe(4);
    expect(summary.onlineMachines).toBe(3);
    expect(summary.offlineMachines).toBe(1);
    expect(summary.totalCapacity).toBe(200);
    expect(summary.totalFlow).toBe(120);
    expect(summary.averagePurity).toBe(93.75);
    expect(summary.warningSites).toBe(1);
    expect(summary.criticalSites).toBe(1);
  });

  it('getOxygenQualityIssues should return stations with purity issues that are online', () => {
    const issues = getOxygenQualityIssues(mockStations);
    expect(issues.length).toBe(1);
    expect(issues[0].id).toBe("ST-2");
  });

  it('getOxygenQualitySummary should summarize purity data correctly', () => {
    const issues = getOxygenQualityIssues(mockStations);
    const summary = getOxygenQualitySummary(mockStations, issues);
    
    expect(summary.active).toBe(2);
    expect(summary.warning).toBe(1);
    expect(summary.critical).toBe(0);
    expect(summary.averageActivePurity).toBe(93.75);
  });
});
