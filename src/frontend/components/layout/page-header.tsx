"use client";

import { Bell } from "lucide-react";
import { useAuth } from "@/frontend/hooks/useAuth";
import type { UserRole } from "@/shared/types";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  showLogout?: boolean;
  variant?: "default" | "dashboard";
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, showLogout, variant = "default", children }: PageHeaderProps) {
  const { user, logout } = useAuth();
  
  // For viewer mode, user might be null, so we just fallback
  const name = user?.name || "Viewer";
  const role = (user?.role as UserRole) || "client";
  const initials = name
    .split(" ")
    .map(n => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  if (variant === "dashboard") {
    return (
      <header className="mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-dashboard-border">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-dashboard-text tracking-tight">{title || "Monitoring PSA Oxygen"}</h1>
          <p className="mt-1 text-xs sm:text-sm text-dashboard-muted leading-relaxed">
            {subtitle || "fleet monitoring mesin PSA gas medis, kapasitas produksi, purity, tekanan dan status operational"}
          </p>
        </div>
        {children && <div className="flex flex-wrap items-center gap-2 shrink-0">{children}</div>}
      </header>
    );
  }

  return (
    <header className="mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl bg-[#2A3441] p-4 sm:px-6 sm:py-5 text-white shadow-sm">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-300">{subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 sm:gap-6 border-t border-slate-700/60 pt-3 sm:border-t-0 sm:pt-0">
        {children && <div className="flex items-center gap-2">{children}</div>}
        <div className="flex items-center gap-3 sm:border-l sm:border-slate-600 sm:pl-6">
          <div className="hidden text-right sm:block">
            <p className="text-xs text-slate-300">Selamat datang,</p>
            <p className="text-sm font-bold capitalize">{user?.username || name}</p>
          </div>
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-slate-500 font-bold text-white ring-2 ring-white/10 text-xs sm:text-sm">
            {initials}
          </div>
        </div>

        {showLogout && (
          <button
            onClick={logout}
            className="rounded border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
          >
            Logout
          </button>
        )}
      </div>
    </header>
  );
}
