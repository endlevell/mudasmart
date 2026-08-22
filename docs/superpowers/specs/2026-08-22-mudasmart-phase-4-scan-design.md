# MUDASmart Fase 4 — Scan Absensi

Tanggal: 2026-08-22

## Cakupan

Tabel `attendance_records`, endpoint scan dengan seluruh validasi Bagian 8, riwayat murid, layar scan kamera live-only, riwayat bulanan.

## Endpoint

| Method | Path | Auth |
|---|---|---|
| POST | /api/attendance/scan | MURID |
| GET | /api/attendance/me?month=&page=&pageSize= | MURID |
| GET | /api/attendance/me/today | MURID |

## Urutan Validasi Scan (Bagian 8)

1. studentId dari JWT.
2. Device binding: tanpa baris/deviceId NULL ditolak 403 login ulang; beda device 403 + audit `device_mismatch`; User-Agent beda hanya log `user_agent_mismatch`.
3. Gate aktif by qrCodeValue, else 400 `QR tidak valid`.
4. Sesi hari ini (WIB): tidak ada 409 belum dibuka; closed 409 sudah ditutup.
5. Murid tanpa classId ditolak 403 (edge case 12).
6. Jam WIB vs config: sebelum mulai 403; lewat akhir 403; ≤ cutoff hadir; selain itu telat.
7. Geofence bila gate.radiusMeters diisi: koordinat wajib (400 minta GPS), haversine > radius 403 + audit `geofence_failed`.
8. Idempotensi: clientNonce sama pada sesi sama mengembalikan hasil identik (200); murid sudah absen dengan nonce lain 409 ramah menyertakan jam.
9. INSERT dengan classIdSnapshot; response 201 `{status, scannedAt, message}`.

Rate limit scan 10/menit/IP. `nowMinutes` bisa diinjeksi untuk test deterministik.

## Riwayat

Response memuat data terpaginated plus `sessionDates` (tanggal yang punya sesi pada bulan itu) agar UI menandai "Tidak Hadir" hanya pada hari bersesi.

## Mobile

- Scan: `expo-camera` CameraView live-only QR; izin kamera; nonce UUID dibuat sekali per percobaan dan dipakai ulang saat Coba Lagi; koordinat via `expo-location` bila izin ada; modal sukses hijau / error merah dengan pesan server.
- Riwayat: filter bulan, badge warna+label status, penanda Tidak Hadir.
- Dashboard murid: status absen hari ini + tombol Scan aktif hanya saat sesi terbuka.

## Test

Replay nonce identik, duplikat nonce beda 409, device mismatch, di luar jam awal/akhir, sesi tertutup/belum, geofence gagal & GPS hilang, murid tanpa kelas, gate nonaktif, role guru ditolak.

## Tidak Dibangun

Rekap/export (Fase 5), checkout sore, izin/sakit.
