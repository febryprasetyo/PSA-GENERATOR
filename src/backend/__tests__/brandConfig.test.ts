import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/brand-config/route";

beforeEach(() => {
  for (const key of ["BRAND_NAME", "BRAND_LOGO", "BRAND_ICON", "BRAND_COLOR", "AUTO_REGISTER_SN"]) {
    vi.stubEnv(key, "");
    vi.stubEnv(`NEXT_PUBLIC_${key}`, "");
  }
});
afterEach(() => { vi.unstubAllEnvs(); });

describe("deployment branding", () => {
  it("uses CMC assets and color when only the runtime brand is configured", async () => {
    vi.stubEnv("BRAND_NAME", "CMC");
    vi.stubEnv("AUTO_REGISTER_SN", "false");
    const response = await GET();
    expect(await response.json()).toEqual({
      brandName: "CMC", brandLogo: "/logo-cmc.png", brandIcon: "/icon-cmc.png",
      brandColor: "red", autoRegisterSn: false,
    });
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("does not mix legacy MGM assets with a server-side CMC brand", async () => {
    vi.stubEnv("BRAND_NAME", "CMC");
    vi.stubEnv("NEXT_PUBLIC_BRAND_NAME", "MGM");
    vi.stubEnv("NEXT_PUBLIC_BRAND_LOGO", "/logo-mgm.png");
    vi.stubEnv("NEXT_PUBLIC_BRAND_ICON", "/icon-mgm.png");
    vi.stubEnv("NEXT_PUBLIC_BRAND_COLOR", "blue");
    expect(await (await GET()).json()).toMatchObject({
      brandName: "CMC", brandLogo: "/logo-cmc.png", brandIcon: "/icon-cmc.png", brandColor: "red",
    });
  });

  it("preserves legacy configuration and reads each instance at runtime", async () => {
    vi.stubEnv("NEXT_PUBLIC_BRAND_NAME", "CMC");
    vi.stubEnv("NEXT_PUBLIC_BRAND_LOGO", "/custom-cmc.png");
    expect(await (await GET()).json()).toMatchObject({ brandName: "CMC", brandLogo: "/custom-cmc.png" });
    vi.stubEnv("NEXT_PUBLIC_BRAND_NAME", "MGM");
    vi.stubEnv("NEXT_PUBLIC_BRAND_LOGO", "");
    expect(await (await GET()).json()).toMatchObject({
      brandName: "MGM", brandLogo: "/logo-mgm.png", brandIcon: "/icon-mgm.png", brandColor: "blue",
    });
  });
});
