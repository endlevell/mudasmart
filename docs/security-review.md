# MUDASmart — Review Keamanan (Fase 6)

Tanggal: 2026-08-22
Cakupan: seluruh modul backend + mobile, terhadap OWASP API Top 10 (2023) dan OWASP Mobile Top 10 (2024).

## OWASP API Top 10

| # | Ancaman | Status | Bukti |
|---|---|---|---|
| API1 | BOLA | Aman | Endpoint murid (`/attendance/me*`, `/auth/me`) menurunkan subjek dari JWT, tanpa parameter ID. Endpoint `:id` hanya GURU/GURU+ADMIN (single-tenant by design). |
| API2 | Autentikasi rusak | Aman | argon2id, access JWT HS256 15m (alg pinned), refresh opaque SHA-256 + rotasi + revoke family saat reuse, rate limit login/refresh/register/scan, pesan login generik. |
| API3 | Otorisasi properti objek | Aman | Semua body/query memakai zod `.strict()`; role ditentukan `registration_codes.role_allowed` di server; PATCH murid tidak menerima isActive/role/NIS. |
| API4 | Konsumsi sumber tak terbatas | Aman | Pagination dibatasi (pageSize ≤ 100), rate limit per IP untuk endpoint sensitif, SQLite lokal. |
| API5 | Fungsi level rusak | Aman | Middleware `auth` → `requireRole('guru')` / `requireAdmin` di semua endpoint non-publik; admin dicek via `teacher_profiles.is_admin`. |
| API6 | Alur bisnis | Aman | Scan: device binding + sesi open + window WIB + geofence opsional + UNIQUE(session,student) + nonce idempoten. Reset device hanya guru, diaudit. |
| API7 | SSRF | Tidak relevan | Server tidak melakukan outbound request berbasis input user. |
| API8 | Misconfiguration | Diperbaiki Fase 6 | `secureHeaders()` aktif; CORS terbatas `CORS_ORIGIN`; env tervalidasi boot; secret wajib ≥32 char & berbeda di produksi. |
| API9 | Inventori | Baik | `/api/health` publik satu-satunya; tidak ada endpoint debug/verbose error (500 generik). |
| API10 | Konsumsi API tak aman | Tidak relevan | Tidak ada webhook/third-party fetch dari input. |

## OWASP Mobile Top 10

| # | Ancaman | Status | Bukti |
|---|---|---|---|
| M1 | Kredensial | Aman | Token hanya di `expo-secure-store` (Keychain/Keystore); tidak pernah AsyncStorage/log. |
| M2 | Supply chain | Baik | `bun audit`: 2 moderate (dev-only: esbuild/drizzle-kit, uuid via expo) — 0 high/critical. `expo-doctor` 20/20. |
| M3 | Auth/Authorization klien | Aman | Keputusan otorisasi sepenuhnya server-side; client hanya UI. |
| M4 | Input/Output injection | Aman | Zod validasi sebelum kirim; render teks RN (tanpa webview); SQL lewat Drizzle bound params. |
| M5 | Komunikasi tidak aman | Aman (prod) | Caddy auto-HTTPS + HSTS + nosniff + DENY frame; cleartext hanya dev localhost. |
| M6 | Privasi | Aman | Data minimal: nama, email, NIS/NIP, device metadata. Tanpa kontak/foto/galeri. |
| M7 | Proteksi binary | Ditangani Fase 7 | R8/ProGuard + minify sesuai Bagian 13; tanpa secret di bundle sejak desain. |
| M8 | Misuse | Aman | Rate limit + cooldown eksponensial; scan live-camera only (tanpa galeri). |
| M9 | Networking | Aman | Fetch selalu ke base URL konfigurasi; refresh-once dengan retry tunggal. |
| M10 | Data extraneous | Aman | Logger server redact password/token/authorization/secret; request logger hanya method/path/status/durasi. |

## Audit Events Terimplementasi

register, login, login_failed, logout, refresh, refresh_reuse, device_rejected, device_mismatch, user_agent_mismatch, student_updated, student_deactivated, device_reset, class_created, class_updated, gate_created, gate_updated, session_opened, session_closed, config_updated, geofence_failed.

## Temuan & Perbaikan Fase 6

1. Register kini rate-limited 5/menit/IP.
2. `listStudentsQuerySchema` & `historyQuerySchema` diberi `.strict()`.
3. Wildcard LIKE (`%`,`_`) disanitasi dari parameter pencarian.
4. Request logger dipasang (metadata saja).
5. `secure-headers` + CORS allowlist ditambahkan.

## Sisa Risiko (disadari)

- Rate limiter in-memory hilang saat restart VPS — diterima untuk MVP single-instance.
- QR statis bisa difoto — mitigasi tetap device binding + window + geofence (desain Bagian 11).
- Certificate pinning — enhancement opsional, belum diimplementasi (sesuai Bagian 2.2).
