import { describe, it, expect, vi } from 'vitest';
import { deriveMachineStatus } from '@/backend/status/deriveMachineStatus';
import { Thresholds } from '@/shared/types';
import dayjs from 'dayjs';

// Mock the dependencies
vi.mock('@/backend/status/purityLevel', () => ({
  getPurityLevel: vi.fn().mockImplementation((val, thresholds) => {
    if (val < thresholds.oxygenPurityCriticalMin) return "critical";
    if (val < thresholds.oxygenPurityWarningMin) return "warning";
    return "normal";
  })
}));

vi.mock('@/backend/status/pressureLevel', () => ({
  getPressureLevel: vi.fn().mockImplementation((val, thresholds) => {
    if (val < thresholds.tankPressureWarningMin || val > thresholds.tankPressureWarningMax) return "warning";
    // We don't have critical pressure in Thresholds payload above, default to normal logic
    return "normal";
  })
}));

describe('deriveMachineStatus Utility', () => {
  const thresholds: Thresholds = {
    oxygenPurityWarningMin: 93,
    oxygenPurityCriticalMin: 90,
    tankPressureWarningMin: 3.5,
    tankPressureWarningMax: 5.5,
    offlineAfterMinutes: 10
  };

  const now = new Date('2026-07-02T10:00:00Z');

  it('should return offline if latestReadingTime is null', () => {
    expect(deriveMachineStatus(null, 95, 4, now, thresholds)).toBe('offline');
  });

  it('should return offline if latestReadingTime is past offline threshold', () => {
    const past = dayjs(now).subtract(15, 'minute').toDate();
    expect(deriveMachineStatus(past, 95, 4, now, thresholds)).toBe('offline');
  });

  it('should return warning if purity is warning level', () => {
    const recent = dayjs(now).subtract(2, 'minute').toDate();
    expect(deriveMachineStatus(recent, 92, 4, now, thresholds)).toBe('warning');
  });

  it('should return warning if pressure is warning level', () => {
    const recent = dayjs(now).subtract(2, 'minute').toDate();
    expect(deriveMachineStatus(recent, 95, 3.2, now, thresholds)).toBe('warning');
  });

  it('should return online if everything is normal', () => {
    const recent = dayjs(now).subtract(2, 'minute').toDate();
    expect(deriveMachineStatus(recent, 95, 4.5, now, thresholds)).toBe('online');
  });
});
