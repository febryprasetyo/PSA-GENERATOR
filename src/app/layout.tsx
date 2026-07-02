import type { Metadata } from "next";
import "./globals.css";
import InnerLayout from "@/app/inner-layout";

export const metadata: Metadata = {
  title: "PSA Oxygen Monitoring",
  description: "Dashboard monitoring mesin PSA gas medis",
  icons: {
    icon: "/icon-mgm.png",
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
