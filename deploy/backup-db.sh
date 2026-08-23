#!/usr/bin/env bash
# Backup SQLite MUDASmart — copy file DB (+WAL) ke folder bertanggal, simpan 14 hari.
# Pasang di cron, contoh 02:30 harian:
#   30 2 * * * /opt/mudasmart/deploy/backup-db.sh >> /var/log/mudasmart-backup.log 2>&1
set -euo pipefail

DB_PATH="${DB_PATH:-/opt/mudasmart/mudasmart-api/data/mudasmart.db}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/mudasmart}"
RETAIN_DAYS=14

STAMP="$(date +%F_%H%M)"
DEST="$BACKUP_ROOT/$STAMP"
mkdir -p "$DEST"

cp "$DB_PATH" "$DEST/"
[ -f "$DB_PATH-wal" ] && cp "$DB_PATH-wal" "$DEST/"
[ -f "$DB_PATH-shm" ] && cp "$DB_PATH-shm" "$DEST/"

find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -mtime +"$RETAIN_DAYS" -exec rm -rf {} +

echo "[$(date '+%F %T')] backup selesai: $DEST"
