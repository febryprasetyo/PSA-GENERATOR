# Review pembersihan repo

Tanggal pemeriksaan: 17 September 2026.
Status eksekusi: **Selesai dieksekusi** pada 17 September 2026 sesuai implementasi yang disetujui.

Dasar pemeriksaan: file yang dilacak Git, import TypeScript/TSX termasuk import dinamis, pencarian referensi teks, package scripts, konfigurasi PM2, dokumentasi, dan status worktree. Seluruh penghapusan telah diverifikasi aman melalui automated typecheck, test runner, dan production build.

## Kandidat utama

| ID | File | Alasan / ketergantungan | Keputusan / Status |
| --- | --- | --- | --- |
| 01 | temp_curl.json | File kosong, 0 byte; tidak ditemukan referensi. | hapus (dieksekusi) |
| 02 | temp_truncate.ts | Skrip sementara untuk `TRUNCATE TABLE master_hospitals CASCADE`; tidak dirujuk aplikasi atau package scripts. | hapus (dieksekusi) |
| 03 | src/frontend/data/devices.ts | Data perangkat contoh; tidak ditemukan pemanggil. | hapus (dieksekusi) |
| 04 | src/frontend/data/logger.ts | Data logger contoh; tidak ditemukan pemanggil. | hapus (dieksekusi) |
| 05 | src/frontend/data/stations.ts | Data stasiun contoh; hanya dipakai ID 03 dan 04. | hapus (dieksekusi) |
| 06 | src/frontend/data/users.ts | Data pengguna contoh; tidak ditemukan pemanggil. | hapus (dieksekusi) |
| 07 | src/backend/redis/client.ts | Implementasi Redis tambahan tanpa pemanggil. API dan MQTT menggunakan `src/backend/redis.ts`. | hapus (dieksekusi) |
| 08 | src/backend/access/scopeMachines.ts | Helper pembatasan mesin berdasarkan role; tidak ditemukan pemanggil. API saat ini memakai mekanisme scope lain. | hapus (dieksekusi) |
| 09 | src/backend/dashboard/qualityIssuesFilter.ts | Helper kualitas oksigen tanpa pemanggil. Dashboard menggunakan fungsi di `src/frontend/lib/dashboard-analytics.ts`. | hapus (dieksekusi) |
| 10 | src/backend/mqtt/flowCalculator.ts | Helper `getCalculationSafeFlow`; tidak ditemukan pemanggil. | hapus (dieksekusi) |
| 11 | src/frontend/lib/auth-session.ts | Pembaca role dari localStorage (`readStoredRole`); tidak ditemukan pemanggil. | hapus (dieksekusi) |
| 12 | src/frontend/components/modals/changelog-modal.tsx | Modal tidak diimpor komponen mana pun. Sidebar saat ini tidak menyediakan kontrol System Updates. | hapus (dieksekusi) |
| 13 | src/shared/changelog.ts | Data changelog dalam aplikasi; hanya dipakai ID 12. | hapus (dieksekusi) |
| 14 | src/backend/db/cleanup_clients.ts | Skrip manual rename tabel `clients` ke `master_hospitals`, lalu truncate. | hapus (dieksekusi) |

## Kandidat opsional: periksa kebutuhan operasional dan arsip

| ID | File | Pertimbangan | Keputusan / Status |
| --- | --- | --- | --- |
| 15 | [deployments.log](deployments.log) | Riwayat deployment; file dipertahankan di disk untuk `deploy.sh`, namun dihapus dari Git tracking (`git rm --cached`) dan diabaikan melalui `.gitignore`. | keep (untracked) |
| 16 | [scripts/migrate-development-telemetry-timezones.ts](scripts/migrate-development-telemetry-timezones.ts) | Skrip koreksi timestamp development, masih didokumentasikan. | keep |
| 17 | [docs/superpowers/plans/2026-09-02-area-monitoring-and-telemetry-revisions.md](docs/superpowers/plans/2026-09-02-area-monitoring-and-telemetry-revisions.md) | Arsip rencana implementasi area dan telemetry. | keep |
| 18 | [docs/superpowers/plans/2026-09-03-telemetry-timezone-normalization.md](docs/superpowers/plans/2026-09-03-telemetry-timezone-normalization.md) | Arsip rencana normalisasi timezone. | keep |
| 19 | [docs/superpowers/plans/2026-09-03-vessel-telemetry.md](docs/superpowers/plans/2026-09-03-vessel-telemetry.md) | Arsip rencana implementasi telemetry vessel. | keep |
| 20 | [docs/superpowers/specs/2026-09-02-area-monitoring-and-telemetry-revisions-design.md](docs/superpowers/specs/2026-09-02-area-monitoring-and-telemetry-revisions-design.md) | Arsip desain area dan telemetry. | keep |
| 21 | [docs/superpowers/specs/2026-09-03-telemetry-timezone-normalization-design.md](docs/superpowers/specs/2026-09-03-telemetry-timezone-normalization-design.md) | Arsip desain timezone dan aturan timestamp. | keep |
| 22 | [docs/superpowers/specs/2026-09-03-vessel-telemetry-design.md](docs/superpowers/specs/2026-09-03-vessel-telemetry-design.md) | Arsip desain telemetry vessel. | keep |

## File hasil proses dan worktree lokal

| ID | File / folder | Pertimbangan | Keputusan / Status |
| --- | --- | --- | --- |
| 23 | tsconfig.tsbuildinfo | Cache TypeScript; dapat dibuat ulang otomatis. | dibersihkan (dieksekusi) |
| 24 | .next/cache/ | Cache Next.js (~280 MiB). | dibersihkan (dieksekusi) |
| 25 | .worktrees/area-monitoring-revisions/ | Worktree Git (~237 MiB); branch sudah dimerge ke `master`. Telah dihapus via `git worktree remove` dan konfigurasi Vitest telah diperbarui. | dibersihkan (dieksekusi) |

## Disarankan keep

- `.next/` selain cache: output build; konfigurasi PM2 menggunakan `next start`.
- `node_modules/`: dependensi lokal yang diperlukan aplikasi dan tooling.
- `.env`, `.env.mgm`, `.env.cmc`, `.env.example`: konfigurasi lingkungan dan contoh konfigurasi.
- `src/backend/db/rs_data.json`, `seed.ts`, `setup_timescale.ts`: data seed dan script yang dirujuk perintah database.
- `src/backend/redis.ts`: klien Redis yang dipakai API dan listener.
- `src/frontend/hooks/useDebounce.ts`, `src/frontend/components/ui/kpi-card.tsx`: masih diimpor komponen aktif.
- Seluruh aset `public/`: logo dan ikon MGM/CMC untuk konfigurasi branding.
- File pengujian dan konfigurasi build, lint, test, database, package manager, serta PM2.
- `src/backend/mqtt/transformPayload.ts`, `parsePsaTopic.ts`, dan helper `src/backend/status/`.
- `README.md` dan `CHANGELOG.md`: dokumentasi utama.
