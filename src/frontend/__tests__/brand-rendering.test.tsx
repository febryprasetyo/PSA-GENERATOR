import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import RootLayout from "@/app/layout";
import { useBrand } from "@/frontend/hooks/useBrand";

vi.mock("next/navigation", () => ({ usePathname: () => "/login", useRouter: () => ({ push: vi.fn() }) }));
afterEach(() => { vi.unstubAllEnvs(); });

function BrandConsumer() {
  const brand = useBrand();
  return <img src={brand.brandLogo} alt={brand.brandName} />;
}

it("renders the instance brand on the initial HTML without waiting for a browser fetch", () => {
  vi.stubEnv("BRAND_NAME", "CMC");
  vi.stubEnv("BRAND_LOGO", "/logo-cmc.png");
  vi.stubEnv("BRAND_ICON", "/icon-cmc.png");
  vi.stubEnv("BRAND_COLOR", "red");
  const html = renderToStaticMarkup(<RootLayout><BrandConsumer /></RootLayout>);
  expect(html).toContain('src="/logo-cmc.png"');
  expect(html).not.toContain("MGM");
  expect(html).not.toContain("logo-mgm");
});
