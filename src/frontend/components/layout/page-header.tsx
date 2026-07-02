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
      <header className="mb-6 flex items-center justify-between pb-4 border-b border-dashboard-border">
        <div>
          <h1 className="text-2xl font-bold text-dashboard-text tracking-tight">Monitoring PSA Oxygen</h1>
          <p className="mt-1 text-sm text-dashboard-muted">
            fleet monitoring mesin PSA gas medis, kapasitas produksi, purity, tekanan dan status operational
          </p>
        </div>
        {children && <div>{children}</div>}
      </header>
    );
  }

  return (
    <header className="mb-6 flex items-center justify-between rounded-xl bg-[#2A3441] px-6 py-5 text-white shadow-sm">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-slate-300">{subtitle}</p>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 border-l border-slate-600 pl-6">
          <div className="hidden text-right sm:block">
            <p className="text-xs text-slate-300">Selamat datang,</p>
            <p className="text-sm font-bold capitalize">{user?.username || name}</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-500 font-bold text-white ring-2 ring-white/10">
            {initials}
          </div>
        </div>

        {showLogout && (
          <button
            onClick={logout}
            className="ml-2 rounded border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
          >
            Logout
          </button>
        )}
      </div>
    </header>
  );
}
