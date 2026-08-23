# MUDASmart — Agent Notes

> File ini dibaca AI coding agent di awal tiap sesi: konteks cepat + aturan wajib — bukan spesifikasi lengkap. Skema DB/endpoint/threat model lengkap ada di `docs/` (sudah ada di repo), dirujuk dari sini — jangan di-copy ke file ini.

## Project

MUDASmart — aplikasi absensi mobile SMA Muhammadiyah 2 Tangerang. Single-tenant (satu sekolah, bukan SaaS). Murid absen scan QR statis di gerbang; guru buka/tutup sesi & kelola data. Monorepo **Bun** (bukan Node/npm): Hono + Drizzle + SQLite (`bun:sqlite`) di `mudasmart-api/`; Expo/React Native (TS) + expo-router di `mudasmart-app/`.

## Repo Map

Root `package.json` → `workspaces: ["mudasmart-api", "mudasmart-app"]` — satu repo, bukan dua.

| Path | Isi |
|---|---|
| `mudasmart-api/src/modules/<domain>/` | routes + service + zod schema + repository per domain |
| `mudasmart-api/src/db/schema/` | Drizzle schema — sumber kebenaran struktur data |
| `mudasmart-app/app/(auth\|murid\|guru)/` | layar per role (expo-router) |
| `mudasmart-app/src/` | api client, store, komponen, `theme.ts` |
| `deploy/` | `mudasmart-api.service` (systemd), `backup-db.sh` |
| `docs/` | spesifikasi & review keamanan per fase |
| `Caddyfile` (root) | reverse proxy, disalin ke VPS saat deploy |

## Commands

```
bun install --linker hoisted    # WAJIB hoisted — linker isolated (default Bun) bikin modul Expo dobel
bun run dev:api                 # → --cwd mudasmart-api dev, API di :3000
bun run dev:app                 # → --cwd mudasmart-app start (Metro, SDK 55)
bun run check                   # typecheck — saat ini cuma cover mudasmart-api
bun run test                    # saat ini cuma cover mudasmart-api
```

- `check`/`test` root belum ke-wire ke `mudasmart-app` — kalau nambah test di app, perlu di-wire manual dulu.
- `bun run db:seed` (isi: admin + kode registrasi + gerbang) disebut README tapi tidak ada di `scripts` root — kemungkinan butuh `--cwd mudasmart-api`, verifikasi dulu sebelum dipakai di dokumentasi/instruksi lain.
- Dependency Expo (`expo-crypto`, `expo-secure-store`, dst.) sengaja di-hoist ke `package.json` root — jangan dipindah ke `mudasmart-app/package.json`, itu bagian dari fix linker di atas.
- `EXPO_PUBLIC_API_URL` di `mudasmart-app/.env`: emulator Android `http://10.0.2.2:3000`, HP fisik pakai IP LAN PC.
- Build release: `cd mudasmart-app && eas build -p android --profile production` (.aab store) atau `--profile preview` (.apk uji internal). R8/ProGuard aktif via `expo-build-properties` — wajib uji di device fisik.

## Non-negotiables

Kalau salah satu ini dilanggar, itu bug keamanan — bukan trade-off yang bisa didiskusikan di tengah jalan.

1. Status hadir/telat/ditolak SELALU dihitung dari jam **server**. Timestamp dari client tidak pernah dipakai untuk keputusan bisnis.
2. Endpoint self-service (`/attendance/me*`, `/auth/me`) menurunkan `studentId`/`userId` dari **JWT** — tidak pernah dari parameter body/URL.
3. `UNIQUE(session_id, student_id)` di `attendance_records` adalah pertahanan inti anti-titip-absen — jangan dilonggarkan, sekalipun "sementara" untuk debugging.
4. Device binding cuma berlaku untuk role **murid**. Jangan diterapkan ke guru.
5. Tiap endpoint baru: zod `.strict()` + ownership check + rate limit (kalau publik/auth-sensitive) — bukan opsional, bukan "ditambah nanti".
6. Password di-hash argon2id. Password & token tidak pernah masuk log.
7. Semua query lewat Drizzle prepared statement — tidak ada raw string concatenation.
8. Tidak ada secret/API key hardcoded di `mudasmart-app/` — bundle mobile bisa dibongkar siapa saja.
9. `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET` di `.env` produksi wajib random ≥32 karakter dan **beda satu sama lain**.

## Skills — pakai sesuai situasi

| Situasi | Skill |
|---|---|
| Fitur baru / keputusan arsitektur belum jelas | `brainstorming` (eksplorasi opsi) → `codebase-design` (pas-kan ke struktur yang ada) |
| Nulis atau ubah kode apapun | `impeccable` — standar berlaku terus-menerus, bukan sekali cek di akhir |
| Bangun/ubah layar UI | `frontend-design` (eksekusi: layout, token, komponen) + `design-taste-frontend` (evaluasi hasil) |
| Keputusan produk/UX non-visual (copy, alur, penamaan fitur) | `taste-skill`\* |
| Sebelum finalisasi hal penting — apalagi yang nyentuh keamanan/data absensi | `grill-me` — stress-test dulu, jangan anggap selesai sebelum ini |

\* asumsi dari nama skill — saya belum lihat deskripsi aslinya, betulkan baris ini kalau meleset.

## MCP — pakai sesuai situasi

**`codebase-memory`** — graph struktur kode (call path, dependency, impact analysis), query lewat MCP, bukan grep manual. Pakai **sebelum**: refactor/rename yang nyentuh modul bersama (schema DB, auth middleware, business logic absensi), atau sebelum ubah fungsi/endpoint yang kemungkinan dipanggil dari banyak tempat.

**`21st`** — generator/katalog komponen **React web** (Tailwind/shadcn). Frontend MUDASmart itu **React Native** — primitif beda total (View/Text vs div/span, StyleSheet/NativeWind vs Tailwind CSS), output-nya **tidak bisa ditempel langsung**. Pakai cuma untuk cari referensi pola visual, lalu adaptasi manual ke komponen RN + `theme.ts`. Selalu review kode yang ditarik dari sana sebelum commit — pernah ada laporan prompt-injection dari komponen hasil generate.

## Commit Convention (wajib dari owner)

- `feats: added <fitur baru>` — fitur/penambahan
- `changes: removed/fixed <perubahan>` — modifikasi/perbaikan

Commit per-logika-perubahan — jangan campur fitur + fix dalam satu commit.

## Code Review

Menggunakan AI harness OpenCode, terdapat agent Code Reviewer di ~/.config/opencode/agents/reviewer.md. Lakukan code audit dan reviewing dengan subagent @reviewer untuk melakukan code review, memastikan bahwa semuanya aman, dan sesuai dengan konteks project.

## Notifikasi VPS

Kalau perubahan menyentuh `mudasmart-api/` (bukan cuma `mudasmart-app/`), WAJIB kabari owner untuk pull & restart:

```bash
cd /opt/mudasmart && git pull && chown -R mudasmart:mudasmart /opt/mudasmart && systemctl restart mudasmart-api
```

Migrasi Drizzle jalan otomatis saat boot API — tidak ada langkah migrate manual. Perubahan `mudasmart-app/` saja **tidak** butuh restart API (app dibuild via Expo/EAS).

> ⚠️ **Perlu ditinjau:** `README.md` bagian "Deploy ulang" pakai command lebih sederhana (tanpa `chown`):
> ```
> cd /opt/mudasmart && git pull
> sudo systemctl restart mudasmart-api
> ```
> Versi ber-`chown` di atas dipertahankan di sini karena itu yang eksplisit ditandai wajib di instruksi paling awal — tapi sekarang ada 2 command "resmi" berbeda untuk operasi yang sama, di 2 file berbeda. Perlu diputuskan satu supaya tidak ambigu buat agent maupun untuk operasional harian.

## Sebelum Anggap Selesai

- [ ] Non-negotiables yang relevan masih utuh
- [ ] Commit ikut convention di atas
- [ ] Nyentuh `mudasmart-api/`? → kabari owner + command restart
- [ ] Nyentuh area sensitif (auth, scan, device binding)? → cek `docs/` ada review keamanan fase terkait
