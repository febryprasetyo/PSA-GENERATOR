import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCmcRegisteredSerials, isUnassignedAutomaticMachine } from "../machines/cmcRegistration";

const { query, Pool } = vi.hoisted(() => {
  const query = vi.fn();
  return { query, Pool: vi.fn(() => ({ query, on: vi.fn() })) };
});
vi.mock("pg", () => ({ Pool }));

describe("CMC registration exclusion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("BRAND_NAME", "MGM");
    vi.stubEnv("CMC_DATABASE_URL", "postgres://localhost/cmc");
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it("looks up active CMC registrations using a parameterized batch", async () => {
    query.mockResolvedValue({ rows: [{ serialNumber: "CMC-1" }] });
    expect(await getCmcRegisteredSerials(["CMC-1", "MGM-1"]))
      .toEqual(new Set(["CMC-1"]));
    expect(query).toHaveBeenCalledWith(
      expect.stringMatching(/deleted_at IS NULL/), [["CMC-1", "MGM-1"]],
    );
  });

  it("does not query CMC for the CMC brand or an empty list", async () => {
    vi.stubEnv("BRAND_NAME", "CMC");
    expect(await getCmcRegisteredSerials(["SN1"])).toEqual(new Set());
    vi.stubEnv("BRAND_NAME", "MGM");
    expect(await getCmcRegisteredSerials([])).toEqual(new Set());
    expect(query).not.toHaveBeenCalled();
  });

  it("keeps standalone deployments working when no CMC database is configured", async () => {
    vi.stubEnv("CMC_DATABASE_URL", "");
    expect(await getCmcRegisteredSerials(["SN1"])).toEqual(new Set());
    expect(query).not.toHaveBeenCalled();
  });

  it("propagates lookup failures so sync cannot register CMC machines accidentally", async () => {
    query.mockRejectedValue(new Error("CMC unavailable"));
    await expect(getCmcRegisteredSerials(["SN1"])).rejects.toThrow("CMC unavailable");
  });

  it.each(["Auto-Registered (SN1)", "Auto-Synced (SN1)"])("recognizes %s only while unassigned", (machineName) => {
    expect(isUnassignedAutomaticMachine({ serialNumber: "SN1", machineName, clientId: null })).toBe(true);
    expect(isUnassignedAutomaticMachine({ serialNumber: "SN1", machineName, clientId: "hospital-1" })).toBe(false);
  });

  it("preserves manually named machines", () => {
    expect(isUnassignedAutomaticMachine({ serialNumber: "SN1", machineName: "Generator 1", clientId: null })).toBe(false);
  });
});
