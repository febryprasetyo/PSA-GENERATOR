import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import InnerLayout from "@/app/inner-layout";
import { getBrandConfig } from "@/shared/config";
import { BrandProvider } from "@/frontend/hooks/useBrand";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  const brand = getBrandConfig();
  return {
    title: `PSA Oxygen Monitoring - ${brand.brandName}`,
    description: `Dashboard monitoring mesin PSA gas medis ${brand.brandName}`,
    icons: { icon: brand.brandIcon },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const brand = getBrandConfig();
  const primary = brand.brandColor === "red" ? "#DC2626" : brand.brandColor === "blue" ? "#2563EB" : brand.brandColor;
  return (
    <html lang="id" style={{ "--primary": primary } as CSSProperties}>
      <BrandProvider config={brand}>
        <InnerLayout>{children}</InnerLayout>
      </BrandProvider>
    </html>
  );
}
