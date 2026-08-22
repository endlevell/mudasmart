# MUDASmart Fase 2 — Data Master Kelas dan Murid

Tanggal: 2026-08-22

## Cakupan

Tabel `classes`, endpoint CRUD kelas & murid termasuk lihat/reset device, layar guru kelola kelas & murid. Middleware role konsisten.

## Skema

- `classes`: id autoincrement, name, gradeLevel, academicYear ("2025/2026"), homeroomTeacherId opsional ref users, isActive, timestamps. Index (academicYear, isActive).
- `student_profiles.classId` opsional ref classes.
- `devices.resetCount` default 0.
- Migrasi di-regenerate penuh (belum ada DB produksi).

## Endpoint (sesuai Bagian 7)

| Method | Path | Auth |
|---|---|---|
| GET | /api/students?page&pageSize&q&classId | GURU |
| GET | /api/students/:id | GURU |
| PATCH | /api/students/:id (fullName, classId) | GURU |
| PATCH | /api/students/:id/deactivate | GURU+ADMIN |
| GET | /api/students/:id/device | GURU |
| PATCH | /api/students/:id/device/reset | GURU |
| GET | /api/classes | AUTH (termasuk jumlah murid aktif) |
| GET | /api/classes/:id | GURU (+ daftar murid aktif) |
| POST | /api/classes | GURU+ADMIN |
| PATCH | /api/classes/:id | GURU+ADMIN |

## Keputusan

- NIS immutable. PATCH murid hanya fullName & classId; isActive hanya lewat deactivate (admin) agar tidak ada jalur bypass.
- Deactivate = isActive false; murid nonaktif gagal login/refresh (sudah ada cek) dan tidak muncul di list default.
- Reset device: deviceId=NULL + resetCount+1; login berikutnya bind ulang. Tanpa baris device: 404.
- Pagination offset page/pageSize (default 20, max 100); q = LIKE fullName/NIS; filter classId.
- `GET /me` mengembalikan isAdmin (join teacher_profiles) untuk gating UI.
- requireAdmin = role guru + is_admin true.
- Audit: student_updated, student_deactivated, device_reset, class_created, class_updated.
- gradeLevel integer 1–13; academicYear pola YYYY/YYYY.

## Mobile

- Kelola Kelas: list + badge jumlah murid; admin bisa tambah/edit inline.
- Kelola Murid: search, filter kelas, list; detail murid: ubah nama/kelas (guru), reset device (konfirmasi), nonaktifkan (admin, konfirmasi).
- Dashboard guru: tautan ke dua layar baru. Tanpa dependency picker baru — komponen Select berbasis Modal.

## Test

- Gate role: murid 403; guru non-admin ditolak di endpoint admin.
- CRUD kelas dasar + hitung murid.
- Assign kelas via PATCH murid.
- Deactivate menolak login.
- Reset device memungkinkan bind device baru; device lama gagal refresh.

## Tidak Dibangun

Bulk import, hapus fisik, izin/sakit, rekap.
