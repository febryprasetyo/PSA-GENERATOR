import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as sync } from "@/app/api/machines/sync/route";
import { GET as dashboard } from "@/app/api/dashboard/route";
import { GET as list } from "@/app/api/machines/route";

const mocks = vi.hoisted(() => ({
  select: vi.fn(), insert: vi.fn(), update: vi.fn(), keys: vi.fn(), get: vi.fn(), set: vi.fn(),
  lookup: vi.fn(),
}));
vi.mock("@/backend/db", () => ({ db: mocks }));
vi.mock("@/backend/redis", () => ({ redis: mocks }));
vi.mock("@/backend/auth/guard", () => ({ requireAuth: vi.fn(async () => ({ payload: { role: "admin" } })) }));
vi.mock("@/backend/machines/cmcRegistration", async (importOriginal) => ({
  ...await importOriginal<object>(), getCmcRegisteredSerials: mocks.lookup,
}));

function selectRows(rows: unknown[]) {
  const where = vi.fn(() => Object.assign(Promise.resolve(rows), { limit: vi.fn(async () => rows) }));
  const chain = { where, leftJoin: vi.fn() };
  chain.leftJoin.mockReturnValue(chain);
  mocks.select.mockReturnValue({ from: vi.fn(() => chain) });
}

describe("MGM sync and machine list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("BRAND_NAME", "MGM");
    vi.stubEnv("REDIS_PREFIX", "psa:mgm:");
    vi.stubEnv("SYNC_REDIS_PREFIX", "");
    mocks.lookup.mockResolvedValue(new Set(["CMC-1"]));
    mocks.keys.mockResolvedValue(["psa:mgm:machine:latest:CMC-1", "psa:mgm:machine:latest:MGM-1"]);
    mocks.get.mockResolvedValue(null);
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it("syncs new MGM serials without creating CMC duplicates", async () => {
    selectRows([]);
    const values = vi.fn(async () => undefined);
    mocks.insert.mockReturnValue({ values });
    const response = await sync();
    expect(await response.json()).toMatchObject({ syncedCount: 1 });
    expect(values).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ serialNumber: "MGM-1" }));
  });

  it("does not restore a soft-deleted CMC duplicate", async () => {
    mocks.keys.mockResolvedValue(["psa:mgm:machine:latest:CMC-1"]);
    selectRows([{ id: "old-cmc", deletedAt: new Date() }]);
    mocks.update.mockReturnValue({ set: () => ({ where: async () => undefined }) });
    const response = await sync();
    expect(await response.json()).toMatchObject({ syncedCount: 0 });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("hides existing automatic CMC duplicates but keeps assigned and manual MGM machines", async () => {
    selectRows([
      { id: "auto", serialNumber: "CMC-1", machineName: "Auto-Registered (CMC-1)", clientId: null },
      { id: "synced", serialNumber: "CMC-1", machineName: "Auto-Synced (CMC-1)", clientId: null },
      { id: "assigned", serialNumber: "CMC-1", machineName: "Auto-Registered (CMC-1)", clientId: "h1" },
      { id: "manual", serialNumber: "CMC-1", machineName: "Generator 1", clientId: null },
      { id: "mgm", serialNumber: "MGM-1", machineName: "Auto-Registered (MGM-1)", clientId: null },
    ]);
    const response = await list();
    const body = await response.json();
    expect(body.machines.map((machine: { id: string }) => machine.id)).toEqual(["assigned", "manual", "mgm"]);
  });

  it("also hides unassigned CMC duplicates on the MGM dashboard", async () => {
    selectRows([
      { id: "CMC-1", serialNumber: "CMC-1", machineName: "Auto-Registered (CMC-1)", clientId: null, status: "offline" },
      { id: "MGM-1", serialNumber: "MGM-1", machineName: "Auto-Registered (MGM-1)", clientId: null, status: "offline" },
    ]);
    const response = await dashboard(new Request("http://localhost/api/dashboard"));
    const body = await response.json();
    expect(body.machines.map((machine: { id: string }) => machine.id)).toEqual(["MGM-1"]);
  });

  it("aborts sync without writes if CMC lookup fails", async () => {
    mocks.lookup.mockRejectedValue(new Error("CMC unavailable"));
    selectRows([]);
    mocks.insert.mockReturnValue({ values: async () => undefined });
    const response = await sync();
    expect(response.status).toBe(500);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("keeps a registered CMC machine offline until its first telemetry heartbeat", async () => {
    vi.stubEnv("BRAND_NAME", "CMC");
    selectRows([{
      id: "CMC-2", serialNumber: "CMC-2", machineName: "CMC-2", clientId: "h2",
      status: "offline", lastSeenAt: null, dbReceivedAt: null, dbTerminalTime: null,
      dbOxygenPurity: null, dbTankPressure: null, dbVessel1: null, dbVessel2: null,
      dbFlowSentral: null, dbFlowBooster: null, dbTotalFlow: null,
      dbStartOfDayTotalFlow: null, dbRunningTimeHours: null,
    }]);
    const response = await dashboard(new Request("http://localhost/api/dashboard"));
    expect(response.status).toBe(200);
    expect((await response.json()).machines[0]).toMatchObject({
      id: "CMC-2", status: "offline", lastUpdate: null, oxygenPurity: null,
    });
  });
});
