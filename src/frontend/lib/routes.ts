import { Database, LayoutDashboard, MonitorCog, Users } from "lucide-react";
import type { ElementType } from "react";
import type { UserRole } from "@/shared/types";

export const appRoutes = {
  home: "/",
  login: "/login",
  viewer: "/viewer",
  users: "/users",
  devices: "/devices",
  clients: "/clients",
  database: "/database",
} as const;

export const protectedNavItems = [
  { href: appRoutes.home, label: "Dashboard", icon: LayoutDashboard as ElementType, roles: ["admin", "operator"] as UserRole[] },
  { href: appRoutes.users, label: "Manajemen User", icon: Users as ElementType, roles: ["admin"] as UserRole[] },
  { href: appRoutes.devices, label: "Manajemen Device", icon: MonitorCog as ElementType, roles: ["admin", "operator"] as UserRole[] },
  { href: appRoutes.database, label: "Database Logger", icon: Database as ElementType, roles: ["admin", "operator"] as UserRole[] },
] as const;

export const viewerPublicNavItems = [appRoutes.home, appRoutes.database] as const;
