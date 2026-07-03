"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sidebar } from "@/frontend/components/layout/sidebar";
import { appRoutes } from "@/frontend/lib/routes";
import { AuthProvider } from "@/frontend/hooks/useAuth";

export default function InnerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isViewerPage = pathname === appRoutes.viewer;
  const isLoginPage = pathname === appRoutes.login || pathname === "/viewer/login";
  const noSidebarPage = isViewerPage || isLoginPage;

  return (
    <body className="min-h-screen bg-dashboard-bg" suppressHydrationWarning>
      <AuthProvider>
        {noSidebarPage ? (
          <main className="min-h-screen w-full overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        ) : (
          <div className="flex h-screen w-full overflow-hidden">
            <Sidebar collapsed={sidebarOpen} setCollapsed={setSidebarOpen} />
            <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
              {children}
            </main>
          </div>
        )}
      </AuthProvider>
    </body>
  );
}
