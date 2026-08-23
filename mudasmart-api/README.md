# mudasmart-api

Backend Hono + Drizzle + SQLite (`bun:sqlite`). Lihat README root untuk panduan lengkap.

```bash
bun install --linker hoisted
cp .env.example .env
bun run db:seed     # admin + kode registrasi + gerbang (password dicetak sekali)
bun run dev         # :3000, migrasi otomatis saat boot
bun run check && bun run test
```

Deploy ulang: `git pull` lalu restart service systemd — migrasi jalan otomatis.
Rotasi kode registrasi: nonaktifkan via SQL atau layar admin; QR gerbang di-regenerate dari app.
