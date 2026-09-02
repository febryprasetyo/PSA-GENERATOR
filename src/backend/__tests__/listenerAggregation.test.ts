import { beforeEach, describe, expect, it, vi } from "vitest";
import { redis } from "../redis";
import { db } from "../db";
import { flushTenMinuteReadings } from "../mqtt/listener";

vi.mock("../redis", () => ({ redis: { smembers: vi.fn(), exists: vi.fn(), rename: vi.fn(), lrange: vi.fn(), del: vi.fn(), srem: vi.fn() } }));
vi.mock("../db", () => ({ db: { insert: vi.fn() } }));

const samples = [
  JSON.stringify({ machineId: "m-1", clientId: "c-1", serialNumber: "SN1", terminalTime: "2026-09-02T10:01:00Z", oxygenPurity: "90", totalFlow: "100" }),
  JSON.stringify({ machineId: "m-1", clientId: "c-1", serialNumber: "SN1", terminalTime: "2026-09-02T10:09:00Z", oxygenPurity: "100", totalFlow: "110" }),
];

describe("MQTT ten-minute persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(redis.smembers).mockResolvedValue(["SN1"]);
    vi.mocked(redis.exists).mockResolvedValueOnce(0).mockResolvedValueOnce(1).mockResolvedValue(0);
    vi.mocked(redis.lrange).mockResolvedValue(samples);
    vi.mocked(redis.rename).mockResolvedValue("OK");
    vi.mocked(redis.del).mockResolvedValue(1);
    vi.mocked(redis.srem).mockResolvedValue(1);
  });

  it("stores one idempotent average and deletes processing data after success", async () => {
    const onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn().mockReturnValue({ onConflictDoNothing });
    vi.mocked(db.insert).mockReturnValue({ values } as never);
    await flushTenMinuteReadings(new Date("2026-09-02T10:00:00Z"));
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ oxygenPurity: "95.00", totalFlow: "105.00" }));
    expect(onConflictDoNothing).toHaveBeenCalled();
    expect(redis.del).toHaveBeenCalledWith(expect.stringContaining("ten_minute_processing"));
  });

  it("retries the same processing data at the next boundary", async () => {
    const write = vi.fn().mockRejectedValueOnce(new Error("database down")).mockResolvedValueOnce(undefined);
    const values = vi.fn().mockReturnValue({ onConflictDoNothing: write });
    vi.mocked(db.insert).mockReturnValue({ values } as never);
    await flushTenMinuteReadings(new Date("2026-09-02T10:00:00Z"));
    expect(redis.del).not.toHaveBeenCalled();
    vi.mocked(redis.exists).mockReset().mockResolvedValue(1);
    await flushTenMinuteReadings(new Date("2026-09-02T10:10:00Z"));
    const renamedProcessingKey = vi.mocked(redis.rename).mock.calls[0][1];
    expect(redis.del).toHaveBeenCalledWith(renamedProcessingKey);
  });
});
