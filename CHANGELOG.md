# Changelog

All notable changes to the **PSA Oxygen Generator Monitoring System** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.1] - 2026-09-17

### Added
- Master Area dinamis dengan relasi satu Area ke banyak Rumah Sakit dan satu Area maksimum per Rumah Sakit.
- Filter Area dan status belum memiliki Area pada tabel dashboard.
- Konfigurasi `CMC_DATABASE_URL` untuk memeriksa registrasi aktif CMC dari instalasi MGM, dengan fallback PM2 dari `.env.cmc` dan panduan konfigurasi pada README.
- Pengujian regresi pemisahan mesin MGM/CMC pada lookup registrasi, sinkronisasi, daftar mesin, dashboard, dan MQTT listener.

### Changed
- Purity `≥90%` ditampilkan Optimal (hijau) dan `<90%` Kritis (kuning).
- Label kapasitas menggunakan `Nm³`, sedangkan flow menggunakan `Nm³/h`.
- Data historis MQTT disimpan sebagai rata-rata per interval 10 menit.
- Ekspor CSV menggunakan rata-rata per 30 menit dan hanya menampilkan SN bila hasil memuat Rumah Sakit multi-mesin.

### Fixed
- Dashboard dan Database CMC kembali membaca data setelah migrasi aditif tabel Area, kolom vessel, dan indeks riwayat. Deployment memperbarui skema MGM/CMC secara terpisah dan berhenti jika migrasi gagal.
- Mesin yang belum pernah mengirim telemetry tetap berstatus offline tanpa waktu pembaruan buatan.
- Aksi create Rumah Sakit kembali tampil pada header master data dan nama divalidasi setelah trimming.
- Sinkronisasi dan auto-registrasi MQTT MGM melewati serial yang masih terdaftar aktif di CMC untuk mencegah duplikasi lintas brand.
- Duplikat CMC berlabel `Auto-Registered` atau `Auto-Synced` yang belum terhubung ke Rumah Sakit disembunyikan dari daftar mesin dan dashboard MGM tanpa menghapus record; mesin yang sudah terhubung atau diberi nama manual tetap ditampilkan.
- Kegagalan lookup database CMC menghentikan request atau pemrosesan pesan terkait agar duplikat tidak terdaftar. Registrasi CMC yang sudah dihapus secara soft-delete tidak memblokir serial; instalasi tanpa `CMC_DATABASE_URL` tetap berjalan tanpa filter lintas brand.

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
