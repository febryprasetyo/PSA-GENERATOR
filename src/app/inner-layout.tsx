"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "@/frontend/components/layout/sidebar";
import { appRoutes } from "@/frontend/lib/routes";
import { AuthProvider } from "@/frontend/hooks/useAuth";
import { useBrand } from "@/frontend/hooks/useBrand";

export default function InnerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const brand = useBrand();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const isViewerPage = pathname === appRoutes.viewer;
  const isLoginPage = pathname === appRoutes.login || pathname === "/viewer/login";
  const noSidebarPage = isViewerPage || isLoginPage;

  const isRedTheme = brand.brandColor === "red" || brand.brandColor === "#DC2626";

  // Auto-close mobile drawer when user navigates
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [pathname]);

  return (
    <body className="min-h-screen bg-dashboard-bg" suppressHydrationWarning>
      <AuthProvider>
        {noSidebarPage ? (
          <main className="min-h-screen w-full overflow-y-auto bg-slate-50 p-3 sm:p-6 lg:p-8 min-w-0">
            {children}
          </main>
        ) : (
          <div className="flex h-screen w-full overflow-hidden flex-col md:flex-row">
            {/* Mobile Top Navigation Bar (< md) */}
            <div className="flex md:hidden h-14 shrink-0 items-center justify-between border-b border-dashboard-border bg-white px-3 sm:px-4 shadow-sm z-30">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-dashboard-border bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-dashboard-primary transition"
                aria-label="Buka menu navigasi"
              >
                <Menu size={20} />
              </button>

              <div className="flex items-center h-full py-2">
                <img
                  src={brand.brandLogo}
                  alt={`${brand.brandName} Logo`}
                  className="h-8 w-auto object-contain max-w-[130px]"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    isRedTheme ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full animate-pulse ${
                      isRedTheme ? "bg-red-600" : "bg-blue-600"
                    }`}
                  />
                  {brand.brandName}
                </span>
              </div>
            </div>

            {/* Sidebar (Desktop docked + Mobile drawer) */}
            <Sidebar
              collapsed={sidebarOpen}
              setCollapsed={setSidebarOpen}
              mobileOpen={mobileDrawerOpen}
              setMobileOpen={setMobileDrawerOpen}
            />

            {/* Main Page Content */}
            <main className="flex-1 overflow-y-auto bg-slate-50 p-3 sm:p-5 lg:p-8 min-w-0">
              {children}
            </main>
          </div>
        )}
      </AuthProvider>
    </body>
  );
}
