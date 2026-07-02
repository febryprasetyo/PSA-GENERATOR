import { stations } from "@/frontend/data/stations";
import type { Device } from "@/frontend/lib/types";

const deviceTypes = ["Controller", "Sensor", "Booster", "Valve", "Power Supply"] as const;
const statuses = ["online", "offline", "maintenance"] as const;
const locations = ["Ruang Kontrol", "Area Mesin", "Panel Utama", "Gudang", "Lantai 1"] as const;

export const devices: Device[] = Array.from({ length: 24 }, (_, index) => {
  const station = stations[index % stations.length];
  const type = deviceTypes[index % deviceTypes.length];
  const status = statuses[index % statuses.length];
  const location = locations[index % locations.length];
  const lastSeen = status === "offline" ? `${12 + (index % 18)} jam lalu` : `${Math.max(1, 30 - (index % 25))} menit lalu`;

  return {
    id: `DEV-${String(index + 1).padStart(3, "0")}`,
    stationId: station.id,
    stationName: station.hospitalName,
    type,
    serialNumber: `SN-${1000 + index}`,
    status,
    lastSeen,
    location,
  };
});
