import { afterEach, describe, expect, it, vi } from "vitest";
import { getMachineLatestRedisKey, getSyncRedisPrefix } from "@/shared/config";

describe("sync Redis prefix", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses an explicit source prefix when development cache is isolated", () => {
    vi.stubEnv("REDIS_PREFIX", "psa:dev:");
    vi.stubEnv("SYNC_REDIS_PREFIX", "psa:mgm:");
    expect(getSyncRedisPrefix()).toBe("psa:mgm:");
  });

  it("defaults to the application Redis prefix", () => {
    vi.stubEnv("REDIS_PREFIX", "psa:dev:");
    vi.stubEnv("SYNC_REDIS_PREFIX", "");
    expect(getSyncRedisPrefix()).toBe("psa:dev:");
  });

  it("builds dashboard telemetry keys from the configured sync source", () => {
    vi.stubEnv("REDIS_PREFIX", "psa:dev:");
    vi.stubEnv("SYNC_REDIS_PREFIX", "psa:mgm:");

    expect(getMachineLatestRedisKey("7031159043030182032"))
      .toBe("psa:mgm:machine:latest:7031159043030182032");
  });
});
