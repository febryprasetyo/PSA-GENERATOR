import type { ReactNode } from "react";
import type { HealthLevel, MachineStatus } from "@/frontend/lib/types";

export const levelStyles: Record<HealthLevel, string> = {
  normal: "bg-green-50 text-dashboard-online ring-green-100",
  warning: "bg-amber-50 text-dashboard-warning ring-amber-100",
  critical: "bg-rose-50 text-dashboard-critical ring-rose-100",
};

export const statusStyles: Record<MachineStatus, string> = {
  online: "bg-green-50 text-dashboard-online ring-green-100",
  offline: "bg-red-50 text-dashboard-offline ring-red-100",
  warning: "bg-amber-50 text-dashboard-warning ring-amber-100",
};

export function Badge({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span className={`inline-flex min-w-20 items-center justify-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${className}`}>
      {children}
    </span>
  );
}
