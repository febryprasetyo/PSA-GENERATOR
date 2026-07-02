export type MachineStatus = "online" | "offline" | "warning";
export type UserRole = "admin" | "operator" | "viewer";
export type UserStatus = "active" | "inactive";
export type DeviceStatus = "online" | "offline" | "maintenance";
export type HealthLevel = "normal" | "warning" | "critical";

export type Station = {
  id: string;
  hospitalName: string;
  machineCount?: number;
  capacityMcDay?: number;
  capacityMcMonth?: number;
  centralFlow: number;
  boosterFlow: number;
  oxygenPurity: number;
  tankPressure: number;
  totalFlow: number;
  actualDailyFlow?: number;
  runningTimeHours: number;
  status: MachineStatus;
  lastUpdate: string;
  region: string;
};

export type StationWithMetrics = Station & {
  utilization: number;
  purityLevel: HealthLevel;
  pressureLevel: HealthLevel;
  healthLevel: HealthLevel;
  healthScore: number;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLogin: string;
};

export type Device = {
  id: string;
  stationId: string;
  stationName: string;
  type: string;
  serialNumber: string;
  status: DeviceStatus;
  lastSeen: string;
  location: string;
};

export type LoggerEntry = {
  id: string;
  stationId: string;
  stationName: string;
  timestamp: string;
  oxygenPurity: number;
  tankPressure: number;
  centralFlow: number;
  boosterFlow: number;
  totalFlow: number;
  status: MachineStatus;
};
