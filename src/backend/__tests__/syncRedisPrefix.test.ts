import { afterEach, describe, expect, it, vi } from "vitest";
import { getSyncRedisPrefix } from "@/shared/config";

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
});
