# MUDASmart Fase 5 — Rekap dan Export

Tanggal: 2026-08-22

## Endpoint

| Method | Path | Auth |
|---|---|---|
| GET | /api/reports/daily?date=&classId= | GURU |
| GET | /api/reports/monthly?month=&classId= | GURU |
| GET | /api/reports/export?type=daily\|monthly&date=&month=&classId= | GURU |

## Aturan Komputasi

- Daily (default tanggal hari ini WIB): per kelas aktif, tiap murid aktif berstatus `hadir`/`telat` bila ada record pada sesi tanggal itu, `Tidak Hadir` bila sesi ada tanpa record, `-` bila hari itu tidak ada sesi. Response menyertakan `sessionStatus`.
- Monthly (default bulan berjalan WIB): agregat per murid aktif — hadir, telat, tidak hadir (jumlah tanggal bersesi bulan itu dikurangi tanggal dengan record murid).
- Semua waktu diputuskan di zona Asia/Jakarta.

## Export

exceljs; workbook satu sheet per tipe (Rekap Harian / Rekap Bulanan); response biner dengan content-type xlsx dan content-disposition attachment. Auth Bearer wajib per-request — tidak ada link publik.

## Mobile

Layar Rekap guru: tab Harian/Bulanan, filter kelas, daftar murid dengan badge warna+label, tombol Export. Unduhan memakai expo-file-system downloadAsync dengan header Bearer lalu expo-sharing untuk membuka file.

## Test

Daily menghitung hadir/tidak hadir/tanpa sesi; monthly menghitung agregat; export mengembalikan xlsx dengan auth dan menolak non-guru.

## Tidak Dibangun

Chart, email, arsip otomatis.
