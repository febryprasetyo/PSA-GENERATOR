import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  on: vi.fn(), select: vi.fn(), insert: vi.fn(), update: vi.fn(), lookup: vi.fn(),
}));
vi.mock("dotenv", () => ({ config: vi.fn() }));
vi.mock("mqtt", () => ({ default: { connect: vi.fn(() => ({ on: mocks.on })) } }));
vi.mock("../db", () => ({ db: mocks }));
vi.mock("../redis", () => ({ redis: {} }));
vi.mock("../machines/cmcRegistration", async (importOriginal) => ({
  ...await importOriginal<object>(), getCmcRegisteredSerials: mocks.lookup,
}));

let receive: (topic: string, payload: Buffer) => Promise<void>;
beforeAll(async () => {
  vi.useFakeTimers();
  const processOn = vi.spyOn(process, "on").mockReturnValue(process);
  await import("../mqtt/listener");
  receive = mocks.on.mock.calls.find(([event]) => event === "message")![1];
  processOn.mockRestore();
});
afterEach(() => { vi.unstubAllEnvs(); });
afterAll(() => { vi.clearAllTimers(); vi.useRealTimers(); });

function machineRows(rows: unknown[]) {
  const chain = { leftJoin: vi.fn(), where: vi.fn(), limit: vi.fn(async () => rows) };
  chain.leftJoin.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  mocks.select.mockReturnValue({ from: () => chain });
}

describe("MQTT CMC registration separation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AUTO_REGISTER_SN", "true");
    mocks.lookup.mockResolvedValue(new Set(["CMC-1"]));
    mocks.insert.mockReturnValue({ values: () => ({ returning: async () => [{ id: "new-machine" }] }) });
    mocks.update.mockReturnValue({ set: () => ({ where: async () => undefined }) });
  });

  it("does not auto-register an unknown CMC serial in MGM", async () => {
    machineRows([]);
    await receive("data/psa/O2generatorMGM/CMC-1", Buffer.from("{}"));
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("does not refresh an old unassigned automatic CMC duplicate", async () => {
    machineRows([{ id: "duplicate", serialNumber: "CMC-1", machineName: "Auto-Registered (CMC-1)", clientId: null }]);
    await receive("data/psa/O2generatorMGM/CMC-1", Buffer.from("{}"));
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("still auto-registers serials absent from CMC", async () => {
    machineRows([]);
    await receive("data/psa/O2generatorMGM/MGM-1", Buffer.from("{}"));
    expect(mocks.insert).toHaveBeenCalledTimes(1);
  });

  it("skips registration if CMC lookup fails", async () => {
    machineRows([]);
    mocks.lookup.mockRejectedValue(new Error("CMC unavailable"));
    await receive("data/psa/O2generatorMGM/CMC-1", Buffer.from("{}"));
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
