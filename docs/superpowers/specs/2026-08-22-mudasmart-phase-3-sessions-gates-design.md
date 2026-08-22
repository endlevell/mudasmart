# MUDASmart Fase 3 — Sesi, Gerbang QR, Config Jam Absen

Tanggal: 2026-08-22

## Cakupan

Tabel `gates`, `attendance_config`, `attendance_sessions`. Endpoint sesi buka/tutup, CRUD gerbang, config jam absen. Seed awal. Layar guru: kontrol sesi + kelola gerbang dengan render QR.

## Zona Waktu

Semua tanggal dan jam absen memakai Asia/Jakarta (WIB) via helper `lib/time.ts` (`todayWib()`, `wibMinutes()`), independen dari timezone VPS. Jam config format `HH:MM`; validasi urutan checkInStart ≤ onTimeCutoff ≤ checkInEnd.

## Endpoint

| Method | Path | Auth |
|---|---|---|
| POST | /api/sessions/open | GURU |
| POST | /api/sessions/close | GURU |
| GET | /api/sessions/today | AUTH |
| GET | /api/sessions/:date | GURU |
| GET | /api/gates | GURU |
| POST | /api/gates | GURU+ADMIN |
| PATCH | /api/gates/:id | GURU+ADMIN |
| GET | /api/config/attendance | AUTH |
| PATCH | /api/config/attendance | GURU+ADMIN |

## Keputusan

- Open idempoten: baris hari ini belum ada dibuat; sudah open dikembalikan; closed dibuka lagi via update baris sama (edge case 14). Close idempoten.
- `qrCodeValue` random server-side; PATCH gate menerima `regenerateQr: true` untuk nilai baru (QR lama mati otomatis karena lookup by value).
- Geofence opsional: latitude/longitude/radiusMeters nullable; radius diisi berarti geofence aktif untuk gate itu (dipakai Fase 4).
- Config single-row; GET membuat default 06:00/07:00/08:00 bila kosong.
- Audit: session_opened, session_closed, gate_created, gate_updated, config_updated.

## Seed

`bun run db:seed`: akun admin (email dari SEED_ADMIN_EMAIL default admin@mudasmart.local, password acak dicetak sekali), kode registrasi guru aktif dicetak sekali, 1 gerbang "Gerbang Utama" dengan QR tergenerate. Aman dijalankan berulang (skip yang sudah ada).

## Mobile

- Dashboard guru: kartu sesi hari ini (status + tombol Buka/Tutup Sesi).
- Kelola Gerbang (admin): list + form tambah/edit, render QR via react-native-qrcode-svg, tombol Regenerasi QR dengan konfirmasi, input koordinat/radius opsional.
- Dashboard murid: status sesi hari ini.

## Test

- Open/close/reopen idempoten satu baris per tanggal.
- sessions/:date validasi format.
- Gate CRUD admin-gated; regenerasi mengubah qrCodeValue.
- Config default saat kosong; urutan jam invalid ditolak.

## Tidak Dibangun

Scan absensi (Fase 4), rekap (Fase 5), checkout sore.
