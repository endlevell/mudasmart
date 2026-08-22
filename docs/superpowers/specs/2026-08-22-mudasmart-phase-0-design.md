# MUDASmart Fase 0 — Fondasi

Tanggal: 2026-08-22

## Cakupan

Menyiapkan monorepo Bun kosong untuk Fase 1. Belum ada endpoint, tabel, UI fitur, atau dependency lint/format tambahan.

## Struktur

```text
mudasmart/
├── mudasmart-api/       # Hono API, Bun runtime
├── mudasmart-app/       # Expo Router mobile
├── docs/
├── Caddyfile
├── package.json         # Bun workspace + skrip root
├── .gitignore
└── .env.example
```

Kedua package memelihara `.env.example` sendiri. Root `.env.example` tidak menyimpan rahasia; hanya menunjuk konfigurasi package.

## Keputusan

- Satu Git repository.
- Bun workspace native; tanpa Turborepo atau package bersama.
- Backend memakai Hono.
- Frontend memakai Expo Router.
- Shared schema Zod ditunda. Fase 1 memakai schema lokal sampai kebutuhan berbagi terbukti.
- Caddyfile hanya skeleton reverse proxy API plus header keamanan. Domain placeholder jelas.

## Kualitas

- TypeScript strict pada kedua package.
- Dependensi Expo dipasang melalui `npx expo install` agar kompatibel SDK.
- `npx expo-doctor` dijalankan setelah scaffold app.
- API menjalankan pemeriksaan TypeScript dan test placeholder bila scaffold menyediakan.

## Tidak Dibangun

Database, migrasi, auth, endpoint bisnis, layar login, Caddy deployment nyata, R8, CI, shared package.

## Verifikasi Fase 0

- `bun install` sukses dari root.
- Skrip root dapat menjalankan pemeriksaan package.
- `npx expo-doctor` tanpa masalah kompatibilitas kritis.
- `git status` hanya memuat file fondasi terencana.
