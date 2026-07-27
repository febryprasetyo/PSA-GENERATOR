export interface ChangelogItem {
  version: string;
  date: string;
  title: string;
  tag: "Major" | "Minor" | "Patch";
  highlights: string[];
  changes: {
    category: "Added" | "Changed" | "Fixed" | "Security";
    items: string[];
  }[];
}

export const CURRENT_VERSION = "v1.2.0";

export const CHANGELOG_DATA: ChangelogItem[] = [
  {
    version: "v1.2.0",
    date: "27 Juli 2026",
    title: "Modal Export Pratinjau & Agregasi Redis Hourly",
    tag: "Minor",
    highlights: [
      "Modal Popup Export Data dengan Date Picker & Range Preset (1d, 1w, 1m, 3m).",
      "Pratinjau sampel data (preview) sebelum mengunduh CSV.",
      "Optimasi MQTT Listener menggunakan Redis buffer & kalkulasi average per 1 jam.",
      "PM2 deployment manager script (dev, deploy, update).",
    ],
    changes: [
      {
        category: "Added",
        items: [
          "Modal dialog Export Data Machine Readings dengan pratinjau sampel data.",
          "Dropdown preset tanggal & date picker manual (maksimal rentang 90 hari).",
          "Komponen modal In-App Changelog & badge versi sistem.",
          "Script deploy.sh dengan dukungan mode PM2 (dev, deploy, update) & deployment logging.",
        ],
      },
      {
        category: "Changed",
        items: [
          "Refactor MQTT listener: Menyimpan data machine_readings setiap 1 jam sekali dengan nilai rata-rata (average).",
          "Filter relasi Rumah Sakit (clientId) wajib ada sebelum data pembacaan disimpan.",
        ],
      },
      {
        category: "Security",
        items: [
          "Restriksi ekspor data role Client hanya untuk Rumah Sakit milik akun tersebut.",
          "Validasi input tanggal & query terenkapsulasi secara ketat.",
        ],
      },
    ],
  },
  {
    version: "v1.1.0",
    date: "20 Juli 2026",
    title: "Start of Day Flow & TimescaleDB Optimization",
    tag: "Minor",
    highlights: [
      "Perhitungan otomatis akumulasi flow harian.",
      "Optimasi hypertable TimescaleDB untuk query time-series.",
    ],
    changes: [
      {
        category: "Added",
        items: [
          "Kalkulasi start of day total flow berdasarkan reset harian.",
          "Dukungan setup otomatis TimescaleDB hypertables.",
        ],
      },
      {
        category: "Fixed",
        items: [
          "Perbaikan auto-update status mesin menjadi offline jika heartbeat terhenti > 5 menit.",
        ],
      },
    ],
  },
  {
    version: "v1.0.0",
    date: "01 Juli 2026",
    title: "Peluncuran Perdana Dashboard Monitoring PSA",
    tag: "Major",
    highlights: [
      "Dashboard realtime monitoring oxygen generator.",
      "Otentikasi JWT HttpOnly Cookie & RBAC (Admin, Operator, Client, Viewer).",
    ],
    changes: [
      {
        category: "Added",
        items: [
          "Modul Dashboard, Logger Database, Manajemen User, Mesin & Rumah Sakit.",
          "Integrasi MQTT Broker untuk konsumsi data sensor realtime.",
        ],
      },
    ],
  },
];
