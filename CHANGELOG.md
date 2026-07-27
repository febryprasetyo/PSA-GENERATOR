# Changelog

All notable changes to the **PSA Oxygen Generator Monitoring System** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-07-27

### Added
- **Export Data Machine Readings Modal**: Ditambahkan dialog modal interaktif dengan filter stasiun/rumah sakit, preset rentang tanggal (`1d`, `1w`, `1m`, `3m`), serta date picker manual (maksimal 90 hari).
- **Verifikasi Pratinjau Data (Preview)**: Fitur pratinjau data sampel 5 baris pertama dan penentuan total record sebelum mengunduh file CSV.
- **In-App Changelog & Version Badge**: Penambahan tampilan versi sistem (`v1.2.0`) di sidebar dan modal riwayat pembaruan sistem.
- **PM2 Deployment Automation**: Menambahkan pilihan eksekusi PM2 (`dev`, `deploy`, `update`) serta pencatatan otomatis ke `deployments.log`.

### Changed
- **MQTT Listener Hourly Aggregation**: Mengubah mekanisme penyimpanan `machine_readings` menggunakan Redis List buffer dan agregasi kalkulasi *average* setiap 1 jam sekali ke PostgreSQL.
- **Hospital Filter Guard (`clientId`)**: Pembacaan data mesin tanpa relasi Rumah Sakit diabaikan secara otomatis demi integritas data.

### Security
- Isolasi hak akses role `client` pada API export data (`/api/history/export`) secara ketat di backend.
- Penggunaan *parameterized queries* via Drizzle ORM pada semua filter riwayat data.

---

## [1.1.0] - 2026-07-20

### Added
- **Start of Day Total Flow Calculation**: Perhitungan otomatis total flow harian berdasarkan pembacaan jam 00:00 UTC.
- **TimescaleDB Hypertable Integration**: Konfigurasi tabel `machine_readings` untuk query time-series performa tinggi.

### Fixed
- Perbaikan sinkronisasi status mesin offline jika `lastSeenAt` melebihi threshold 5 menit.

---

## [1.0.0] - 2026-07-01

### Added
- Launch perdana Dashboard Monitoring PSA Oxygen Generator (Frontend Next.js App Router + TailwindCSS).
- Realtime Monitoring MQTT Listener via Socket & Redis Caching.
- Manajemen User (RBAC: Admin, Operator, Client, Viewer) dan Otentikasi JWT Cookie HttpOnly.
