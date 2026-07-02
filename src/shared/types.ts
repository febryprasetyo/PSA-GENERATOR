export type MachineStatus = "online" | "warning" | "offline";
export type Level = "normal" | "warning" | "critical";

export type UserRole = "admin" | "operator" | "client" | "viewer";

export interface User {
  id: string;
  clientId?: string | null;
  hospitalName?: string | null;
  name: string;
  username: string;
  role: UserRole;
  status: "active" | "inactive";
  lastLoginAt?: string | null;
  createdAt?: string;
}

export interface Thresholds {
  oxygenPurityWarningMin: number;
  oxygenPurityCriticalMin: number;
  tankPressureWarningMin: number;
  tankPressureWarningMax: number;
  offlineAfterMinutes: number;
}
