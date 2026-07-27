import type { Metadata } from "next";
import "./globals.css";
import InnerLayout from "@/app/inner-layout";
import { BRAND_NAME, BRAND_ICON } from "@/shared/config";

export const metadata: Metadata = {
  title: `PSA Oxygen Monitoring - ${BRAND_NAME}`,
  description: `Dashboard monitoring mesin PSA gas medis ${BRAND_NAME}`,
  icons: {
    icon: BRAND_ICON,
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <InnerLayout>{children}</InnerLayout>
    </html>
  );
}
