import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redis } from '../redis';
import { db } from '../db';
import { flushHourlyReadings } from '../mqtt/listener';

vi.mock('../redis', () => ({
  redis: {
    smembers: vi.fn(),
    pipeline: vi.fn(),
  },
}));

vi.mock('../db', () => ({
  db: {
    insert: vi.fn(),
  },
}));

describe('MQTT Hourly Listener Aggregation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate averages and insert aggregated data into machineReadings for machines with clientId', async () => {
    const mockSmembers = vi.mocked(redis.smembers);
    mockSmembers.mockResolvedValue(['SN12345']);

    const samples = [
      JSON.stringify({
        machineId: 'm-1',
        clientId: 'c-1',
        serialNumber: 'SN12345',
        terminalTime: new Date().toISOString(),
        oxygenPurity: '90.00',
        tankPressure: '5.00',
        flowSentral: '10.00',
        flowBooster: '0.00',
        totalFlow: '100.00',
        runningTimeHours: '10.00',
        mqttTopic: 'data/psa/SN12345',
        rawPayload: { test: 1 },
      }),
      JSON.stringify({
        machineId: 'm-1',
        clientId: 'c-1',
        serialNumber: 'SN12345',
        terminalTime: new Date().toISOString(),
        oxygenPurity: '100.00',
        tankPressure: '7.00',
        flowSentral: '20.00',
        flowBooster: '4.00',
        totalFlow: '110.00',
        runningTimeHours: '11.00',
        mqttTopic: 'data/psa/SN12345',
        rawPayload: { test: 2 },
      }),
    ];

    const mockPipeline = {
      lrange: vi.fn(),
      del: vi.fn(),
      srem: vi.fn(),
      exec: vi.fn().mockResolvedValue([
        [null, samples],
        [null, 1],
        [null, 1],
      ]),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(redis.pipeline).mockReturnValue(mockPipeline as any);

    const mockValues = vi.fn().mockResolvedValue(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);

    await flushHourlyReadings();

    expect(db.insert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        machineId: 'm-1',
        clientId: 'c-1',
        serialNumber: 'SN12345',
        oxygenPurity: '95.00',
        tankPressure: '6.00',
        flowSentral: '15.00',
        flowBooster: '2.00',
        totalFlow: '105.00',
        runningTimeHours: '10.50',
      })
    );
  });

  it('should skip inserting if clientId is missing in samples', async () => {
    const mockSmembers = vi.mocked(redis.smembers);
    mockSmembers.mockResolvedValue(['SN_NO_HOSPITAL']);

    const samples = [
      JSON.stringify({
        machineId: 'm-2',
        clientId: null,
        serialNumber: 'SN_NO_HOSPITAL',
        terminalTime: new Date().toISOString(),
        oxygenPurity: '95.00',
      }),
    ];

    const mockPipeline = {
      lrange: vi.fn(),
      del: vi.fn(),
      srem: vi.fn(),
      exec: vi.fn().mockResolvedValue([
        [null, samples],
        [null, 1],
        [null, 1],
      ]),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(redis.pipeline).mockReturnValue(mockPipeline as any);

    await flushHourlyReadings();

    expect(db.insert).not.toHaveBeenCalled();
  });
});
