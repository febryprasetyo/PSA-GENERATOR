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

  it("keeps processing data when the database write fails", async () => {
    const values = vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockRejectedValue(new Error("database down")) });
    vi.mocked(db.insert).mockReturnValue({ values } as never);
    await flushTenMinuteReadings(new Date("2026-09-02T10:00:00Z"));
    expect(redis.del).not.toHaveBeenCalled();
  });
});
