# MUDASmart — Agent Notes

## Commit convention (wajib dari owner)

Setiap perubahan HARUS di-commit dengan style pesan owner:

- `feats: added <fitur baru>` — untuk fitur/penambahan
- `changes: removed/fixed <perubahan>` — untuk modifikasi/perbaikan

Commit per-logika-perubahan (jangan campur fitur + fix dalam satu commit).

## Notifikasi VPS

Jika perubahan menyentuh `mudasmart-api/` (bukan hanya `mudasmart-app/`), WAJIB kabari owner
untuk pull & restart di VPS dengan command ini:

```bash
cd /opt/mudasmart && git pull && chown -R mudasmart:mudasmart /opt/mudasmart && systemctl restart mudasmart-api
```

Perubahan `mudasmart-app/` saja TIDAK butuh restart API (app dibuild via Expo/EAS).
