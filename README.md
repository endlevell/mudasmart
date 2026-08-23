# MUDASmart

Aplikasi absensi QR untuk SMA Muhammadiyah 2 Tangerang. Monorepo Bun:

- `mudasmart-api/` — backend Hono + Drizzle + SQLite (bun:sqlite)
- `mudasmart-app/` — mobile Expo Router (React Native, TypeScript)
- `deploy/` — artefak deployment (systemd, backup)
- `docs/` — spesifikasi & review keamanan per fase

## Development

```bash
bun install --linker hoisted   # hoisted wajib — linker isolated Bun memicu duplikat modul Expo
cp mudasmart-api/.env.example mudasmart-api/.env
cp mudasmart-app/.env.example mudasmart-app/.env
bun run db:seed                # dari mudasmart-api: admin + kode registrasi + gerbang
bun run dev:api                # API di :3000
bun run dev:app                # Metro; buka via Expo Go (SDK 55)
```

`EXPO_PUBLIC_API_URL` di `mudasmart-app/.env`: emulator Android `http://10.0.2.2:3000`, HP fisik pakai IP LAN PC.

Skrip root: `check` (typecheck), `test`, `dev:api`, `dev:app`.

## Build Release Android

```bash
cd mudasmart-app
eas build -p android --profile production    # .aab store
eas build -p android --profile preview       # .apk uji internal
```

R8/ProGuard aktif via `expo-build-properties` (`app.json`) dengan aturan `proguard-rules.pro`. WAJIB uji build release di device fisik: login, scan QR, buka/tutup sesi, export Excel — pantau Logcat untuk `ClassNotFoundException`/`NoSuchMethodError`. Bandingkan ukuran APK sebelum/sesudah minify.

## Deploy VPS

1. Arahkan DNS A record ke IP VPS; Caddy auto-HTTPS.
2. Clone repo ke `/opt/mudasmart`; `bun install --linker hoisted`.
3. Isi `mudasmart-api/.env` produksi — `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET` random ≥32 karakter dan BERBEDA.
4. Systemd:
   ```bash
   sudo cp deploy/mudasmart-api.service /etc/systemd/system/
   sudo systemctl daemon-reload && sudo systemctl enable --now mudasmart-api
   ```
5. Caddy:
   ```bash
   sudo cp Caddyfile /etc/caddy/Caddyfile.d/mudasmart   # ganti domain placeholder
   sudo systemctl reload caddy
   ```
6. Backup harian (cron):
   ```bash
   sudo cp deploy/backup-db.sh /opt/mudasmart/deploy/ && sudo chmod +x /opt/mudasmart/deploy/backup-db.sh
   # cron: 30 2 * * * /opt/mudasmart/deploy/backup-db.sh
   ```

### Deploy ulang

```bash
cd /opt/mudasmart && git pull
sudo systemctl restart mudasmart-api
```
Migrasi berjalan otomatis saat boot API.

### Rotasi kode registrasi & QR gerbang

- Kode registrasi: login guru admin → layar profil/pengaturan → kelola kode (nonaktifkan yang bocor, buat baru). Bila UI belum tersedia, nonaktifkan via SQL: `UPDATE registration_codes SET is_active = 0 WHERE code = '...';` lalu insert baru.
- QR gerbang: login guru admin → Kelola Gerbang → **Regenerasi QR** (QR lama langsung mati) → cetak ulang.

### Restore backup

Hentikan service, salin file backup ke `data/mudasmart.db` (+ `-wal`/`-shm` bila ada), nyalakan lagi.
