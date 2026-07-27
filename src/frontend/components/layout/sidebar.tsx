import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ChevronLeft, LayoutDashboard, Database, History, MapPin, Users, Settings, Wrench, FileText, Hospital, Sparkles } from "lucide-react";
import { appRoutes } from "@/frontend/lib/routes";
import { useAuth } from "@/frontend/hooks/useAuth";
import type { UserRole } from "@/shared/types";
import { CURRENT_VERSION } from "@/shared/changelog";
import { ChangelogModal } from "@/frontend/components/modals/changelog-modal";
import { useBrand } from "@/frontend/hooks/useBrand";

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const brand = useBrand();
  const role = (user?.role as UserRole) || "client";
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);

  const isRedTheme = brand.brandColor === "red" || brand.brandColor === "#DC2626";

  const overviewMenu = [
    { label: "Dashboard", href: appRoutes.home, icon: LayoutDashboard, roles: ["admin", "operator", "client"] },
    { label: "Database", href: appRoutes.database, icon: Database, roles: ["admin", "operator"] },
  ];

  const managementMenu = [
    { label: "User", href: appRoutes.users, icon: Users, roles: ["admin", "operator"] },
    { label: "Mesin", href: appRoutes.devices, icon: Settings, roles: ["admin", "operator"] },
    { label: "Rumah Sakit", href: appRoutes.clients, icon: Hospital, roles: ["admin", "operator"] },
  ];

  const renderMenu = (items: { label: string; href: string; icon: React.ElementType; roles: string[] }[]) => {
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
            title={collapsed ? item.label : undefined}
            className={`group relative flex items-center gap-3 py-2.5 px-4 font-semibold transition-colors ${
              isActive
                ? `${activeBg} ${activeText} border-l-4 ${activeBorder}`
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 border-l-4 border-transparent"
            }`}
          >
            <Icon size={18} className={isActive ? activeText : "text-slate-400 group-hover:text-slate-600"} />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      });
  };

  return (
    <>
      <ChangelogModal
        isOpen={isChangelogOpen}
        onClose={() => setIsChangelogOpen(false)}
      />

      <aside
        className={`relative flex flex-col border-r border-dashboard-border bg-white transition-all duration-300 ${
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

        
        {/* Toggle Button */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className={`absolute -right-3 top-5 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-dashboard-border bg-white text-slate-400 hover:text-dashboard-primary transition-transform shadow-sm ${collapsed ? "rotate-180" : ""}`}
        >
          <ChevronLeft size={14} />
        </button>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="mb-6">
            {!collapsed && (
              <p className="px-5 mb-2 text-xs font-extrabold uppercase tracking-widest text-slate-400">Overview</p>
            )}
            <nav className="flex flex-col space-y-1">
              {renderMenu(overviewMenu)}
            </nav>
          </div>

          <div>
            {!collapsed && (
              <p className="px-5 mb-2 text-xs font-extrabold uppercase tracking-widest text-slate-400">Management</p>
            )}
            <nav className="flex flex-col space-y-1">
              {renderMenu(managementMenu)}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="shrink-0 border-t border-dashboard-border p-4 space-y-2">
          {/* Version / Changelog Trigger Button */}
          <button
            type="button"
            onClick={() => setIsChangelogOpen(true)}
            className={`flex w-full items-center gap-2 rounded-md bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:text-dashboard-primary hover:border-blue-200 transition ${
              collapsed ? "justify-center" : ""
            }`}
            title={collapsed ? `Changelog (${CURRENT_VERSION})` : undefined}
          >
            <Sparkles size={16} className="text-blue-500 shrink-0" />
            {!collapsed && (
              <div className="flex items-center justify-between w-full">
                <span>System Updates</span>
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                  {CURRENT_VERSION}
                </span>
              </div>
            )}
          </button>

          <button
            onClick={logout}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 transition ${collapsed ? "justify-center" : ""}`}
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
