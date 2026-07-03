import type { Station } from "@/frontend/lib/types";

const hospitals = [
  "RS Harapan Sentosa",
  "RSUD Cendana",
  "RS Mitra Medika",
  "RS Bunda Sehat",
  "RS Prima Husada",
  "RS Pelita Kasih",
  "RS Graha Oxygen",
  "RS Permata Ibu",
  "RS Sumber Waras",
  "RS Bhakti Medika",
  "RS Kartika",
  "RS Awal Sehat",
];

const regions = ["DKI Jakarta", "Jawa Barat", "Jawa Tengah", "Jawa Timur", "Banten", "Bali", "Sumatera Utara"];

function statusForIndex(index: number): Station["status"] {
  if (index % 23 === 0 || index % 41 === 0) return "offline";
  if (index % 9 === 0 || index % 17 === 0) return "warning";
  return "online";
}

export const stations: Station[] = Array.from({ length: 124 }, (_, index) => {
  const idNumber = index + 1;
  const machineCount = (idNumber % 4) + 1;
  const capacityMcDay = 420 + (idNumber % 9) * 95 + machineCount * 55;
  const status = statusForIndex(idNumber);
  const centralFlow = status === "offline" ? 0 : 120 + (idNumber % 11) * 28;
  const boosterFlow = status === "offline" ? 0 : 55 + (idNumber % 7) * 18;
  const oxygenPurity =
    status === "offline" ? 0 : idNumber % 29 === 0 ? 88.6 : idNumber % 9 === 0 ? 91.8 : 93.4 + (idNumber % 16) * 0.14;
  const tankPressure = status === "offline" ? 0 : idNumber % 31 === 0 ? 3.4 : idNumber % 17 === 0 ? 8.7 : 4.8 + (idNumber % 20) * 0.13;
  const minutesAgo = (idNumber * 3) % 58;

  return {
    id: `PSA-${String(idNumber).padStart(4, "0")}`,
    hospitalName: `${hospitals[index % hospitals.length]} ${regions[index % regions.length]}`,
    machineCount,
    capacityMcDay,
    centralFlow: Number(centralFlow.toFixed(1)),
    boosterFlow: Number(boosterFlow.toFixed(1)),
    oxygenPurity: Number(oxygenPurity.toFixed(1)),
    tankPressure: Number(tankPressure.toFixed(1)),
    status,
    lastUpdate: `${minutesAgo === 0 ? 1 : minutesAgo} menit lalu`,
    region: regions[index % regions.length],
    totalFlow: 0,
    runningTimeHours: 0,
  };
});
