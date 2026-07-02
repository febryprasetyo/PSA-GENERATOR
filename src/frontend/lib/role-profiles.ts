import { Eye, ShieldCheck, UserRound } from "lucide-react";
import type { ElementType } from "react";
import type { UserRole } from "@/shared/types";

export type DashboardRoleProfile = {
  label: string;
  summary: string;
  className: string;
  icon: ElementType;
};

export const dashboardRoleProfiles: Record<UserRole, DashboardRoleProfile> = {
  admin: {
    label: "Admin",
    summary: "Kontrol penuh",
    className: "border-blue-100 bg-blue-50 text-dashboard-primary",
    icon: ShieldCheck,
  },
  operator: {
    label: "User",
    summary: "Operasional",
    className: "border-teal-100 bg-teal-50 text-dashboard-purity",
    icon: UserRound,
  },
  client: {
    label: "Client",
    summary: "Monitor mesin",
    className: "border-slate-200 bg-slate-100 text-slate-700",
    icon: Eye,
  },
};
