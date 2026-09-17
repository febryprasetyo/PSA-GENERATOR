import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ChevronLeft, LayoutDashboard, Database, MapPin, Users, Settings, Hospital, X } from "lucide-react";
import { appRoutes } from "@/frontend/lib/routes";
import { useAuth } from "@/frontend/hooks/useAuth";
import type { UserRole } from "@/shared/types";
import { useBrand } from "@/frontend/hooks/useBrand";

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export function Sidebar({ collapsed, setCollapsed, mobileOpen = false, setMobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const brand = useBrand();
  const role = (user?.role as UserRole) || "client";

  const isRedTheme = brand.brandColor === "red" || brand.brandColor === "#DC2626";

  const overviewMenu = [
    { label: "Dashboard", href: appRoutes.home, icon: LayoutDashboard, roles: ["admin", "operator", "client"] },
    { label: "Database", href: appRoutes.database, icon: Database, roles: ["admin", "operator", "client"] },
  ];

  const managementMenu = [
    { label: "User", href: appRoutes.users, icon: Users, roles: ["admin", "operator"] },
    { label: "Mesin", href: appRoutes.devices, icon: Settings, roles: ["admin", "operator"] },
    { label: "Rumah Sakit", href: appRoutes.clients, icon: Hospital, roles: ["admin", "operator"] },
    { label: "Area", href: appRoutes.areas, icon: MapPin, roles: ["admin", "operator"] },
  ];

  const renderMenuItems = (
    items: { label: string; href: string; icon: React.ElementType; roles: string[] }[],
    isMobile: boolean = false
  ) => {
    return items
      .filter((item) => item.roles.includes(role))
      .map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        const activeBg = isRedTheme ? "bg-red-50" : "bg-blue-50";
        const activeText = isRedTheme ? "text-red-600" : "text-dashboard-primary";
        const activeBorder = isRedTheme ? "border-red-600" : "border-dashboard-primary";

        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={() => {
              if (isMobile && setMobileOpen) {
                setMobileOpen(false);
              }
            }}
            title={collapsed && !isMobile ? item.label : undefined}
            className={`group relative flex items-center gap-3 py-2.5 px-4 font-semibold transition-colors ${
              isActive
                ? `${activeBg} ${activeText} border-l-4 ${activeBorder}`
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 border-l-4 border-transparent"
            }`}
          >
            <Icon size={18} className={isActive ? activeText : "text-slate-400 group-hover:text-slate-600"} />
            {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
          </Link>
        );
      });
  };

  return (
    <>
      {/* --- MOBILE BACKDROP & DRAWER (screen < md) --- */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity md:hidden"
          onClick={() => setMobileOpen?.(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-dashboard-border bg-white shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-4 border-b border-dashboard-border">
          <div className="flex items-center h-full py-2">
            <img src={brand.brandLogo} alt={`${brand.brandName} Logo`} className="h-10 w-auto object-contain max-w-[180px]" />
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen?.(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-dashboard-border bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Tutup menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="mb-6">
            <p className="px-5 mb-2 text-xs font-extrabold uppercase tracking-widest text-slate-400">Overview</p>
            <nav className="flex flex-col space-y-1">
              {renderMenuItems(overviewMenu, true)}
            </nav>
          </div>

          <div>
            <p className="px-5 mb-2 text-xs font-extrabold uppercase tracking-widest text-slate-400">Management</p>
            <nav className="flex flex-col space-y-1">
              {renderMenuItems(managementMenu, true)}
            </nav>
          </div>
        </div>

        <div className="shrink-0 border-t border-dashboard-border p-4 space-y-2">
          <button
            onClick={() => {
              setMobileOpen?.(false);
              logout();
            }}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
          <p className="px-3 text-xs text-slate-400">Sign out of your account</p>
        </div>
      </aside>

      {/* --- DESKTOP DOCKED SIDEBAR (screen >= md) --- */}
      <aside
        className={`relative hidden md:flex flex-col border-r border-dashboard-border bg-white transition-all duration-300 shrink-0 ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-4 border-b border-dashboard-border">
          <div className="flex w-full items-center justify-center overflow-hidden h-full py-3">
            {collapsed ? (
              <img src={brand.brandIcon} alt={`${brand.brandName} Icon`} className="h-full w-auto object-contain" />
            ) : (
              <img src={brand.brandLogo} alt={`${brand.brandName} Logo`} className="h-full w-auto object-contain" />
            )}
          </div>
        </div>

        {/* Desktop Collapse Toggle Button */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className={`absolute -right-3 top-5 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-dashboard-border bg-white text-slate-400 hover:text-dashboard-primary transition-transform shadow-sm ${
            collapsed ? "rotate-180" : ""
          }`}
          aria-label={collapsed ? "Perluas menu" : "Ciutkan menu"}
        >
          <ChevronLeft size={14} />
        </button>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="mb-6">
            {!collapsed && (
              <p className="px-5 mb-2 text-xs font-extrabold uppercase tracking-widest text-slate-400">Overview</p>
            )}
            <nav className="flex flex-col space-y-1">
              {renderMenuItems(overviewMenu, false)}
            </nav>
          </div>

          <div>
            {!collapsed && (
              <p className="px-5 mb-2 text-xs font-extrabold uppercase tracking-widest text-slate-400">Management</p>
            )}
            <nav className="flex flex-col space-y-1">
              {renderMenuItems(managementMenu, false)}
            </nav>
          </div>
        </div>

        {/* Desktop Sidebar Footer */}
        <div className="shrink-0 border-t border-dashboard-border p-4 space-y-2">
          <button
            onClick={logout}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 transition ${
              collapsed ? "justify-center" : ""
            }`}
            title={collapsed ? "Logout" : undefined}
          >
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
          {!collapsed && (
            <p className="px-3 text-xs text-slate-400">Sign out of your account</p>
          )}
        </div>
      </aside>
    </>
  );
}
