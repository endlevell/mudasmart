# MUDASmart Fase 1 — Auth dan Device Binding

Tanggal: 2026-08-22

## Cakupan

Auth, binding perangkat murid, token refresh rotasi, route guard mobile. Reset/ganti password ditunda; endpoint belum dispesifikasikan.

## Modul Backend

- `db`: Drizzle SQLite dan migrasi untuk `users`, profil murid/guru, `devices`, `refresh_tokens`, `registration_codes`, `audit_logs`.
- `auth`: route tipis, schema Zod `.strict()`, service sebagai interface auth, repository query prepared statement.
- `lib/jwt`: access JWT HS256 berisi `sub`, `role`, `jti`, TTL 15 menit. Refresh opaque random 256-bit; hanya SHA-256 hash disimpan DB.
- `lib/password`: argon2id hash/verify.
- `middleware`: access auth, role check, rate-limit, redacted logger, error handler.

Service auth menjalankan register, login, dan refresh dalam SQLite transaction. Ini menjaga pemakaian kode, binding perangkat, serta rotasi token atomik.

## Perilaku

- Register menerima kode sekolah, tidak menerima role. `registration_codes.role_allowed` menentukan role.
- Murid login: device belum ada dibind; device sama diizinkan; device beda ditolak 403 dan diaudit.
- Guru tidak diblok device binding.
- Refresh me-revoke token lama dan menerbitkan token baru dalam family sama. Reuse token revoked me-revoke seluruh family dan diaudit.
- Login gagal selalu `Email atau kata sandi salah`.
- Rate limit in-memory: 5 percobaan per IP per menit, cooldown eksponensial maksimal 15 menit. Hilang saat restart; cukup single VPS MVP.
- Client mengirim refresh token JSON, menyimpan access/refresh/device UUID dalam `expo-secure-store`; tidak memakai cookie.

## Route

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Mobile

Auth store dan wrapper fetch melakukan refresh sekali pada 401, lalu mengulang request. Root Expo Router mengarahkan berdasarkan sesi dan role. Layar Login/Register Bahasa Indonesia dengan validasi Zod inline.

## Test

- Field role ekstra ditolak.
- Role ditentukan kode registrasi.
- Device murid beda ditolak.
- Login gagal generik.
- Refresh token berotasi.
- Reuse refresh me-revoke family.
- Token/password tidak masuk log.

## Tidak Dibangun

Reset/ganti password, CRUD murid/kelas, attendance, geofence, reports, certificate pinning.
