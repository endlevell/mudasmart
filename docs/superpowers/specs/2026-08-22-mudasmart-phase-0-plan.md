# MUDASmart Fase 0 — Rencana Implementasi

Tanggal: 2026-08-22

## Modul

- Root workspace: satu interface pengelolaan, `bun install`, `bun run check`, `bun run dev`.
- `mudasmart-api`: modul proses Hono tunggal; konfigurasi lingkungan tervalidasi saat boot pada Fase 1.
- `mudasmart-app`: modul Expo Router tunggal; route root menjadi seam navigasi.

Tidak dibuat adapter atau shared package. Belum ada variasi nyata; seam tambahan akan dangkal.

## Langkah

1. Buat root `package.json` Bun workspace, `.gitignore`, `.env.example`, skrip delegasi minimal.
2. Scaffold Expo TypeScript dengan Expo Router di `mudasmart-app`; pertahankan template hanya bila perlu menjalankan app.
3. Buat `mudasmart-api` TypeScript minimal dengan Hono, entrypoint health sementara, skrip dev/check/test.
4. Tambah `.env.example` per package; API memuat `PORT`, frontend memuat `EXPO_PUBLIC_API_URL` placeholder.
5. Tambah `Caddyfile` placeholder sesuai spesifikasi HTTPS/header.
6. Jalankan `bun install`, pemeriksaan TypeScript API, `npx expo-doctor`, pemeriksaan workspace.
7. Review diff, reviewer, commit Fase 0.

## Kriteria Sukses

- Satu lockfile Bun root.
- API dapat start dan melayani `/api/health` sementara.
- Expo project valid, router terpasang.
- Tidak ada secret, database, auth, fitur bisnis, atau dependency tidak perlu.

## Risiko

- `create-expo-app` dapat menghasilkan struktur di luar spec. Hapus hanya template yang tidak diperlukan agar root route tetap valid.
- API Hono menggunakan port 3000 sebagai default; environment final tervalidasi pada Fase 1.
