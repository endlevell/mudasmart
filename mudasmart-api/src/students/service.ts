import { repository as authRepository } from '../auth/repository';
import { fail } from '../lib/http';
import { hashPassword, id as newId } from '../lib/auth';
import { classesRepository } from '../classes/repository';
import { studentsRepository } from './repository';

const now = () => Date.now();

export interface ImportRow {
  fullName: string;
  email: string;
  nis: string;
  className?: string;
}

export const studentsService = {
  list(query: { page: number; pageSize: number; q?: string; classId?: number }) {
    return studentsRepository.list({ ...query, limit: query.pageSize, offset: (query.page - 1) * query.pageSize }).then((result) => ({ ...result, page: query.page, pageSize: query.pageSize }));
  },

  detail(id: string) {
    const student = studentsRepository.byId(id);
    if (!student) throw fail(404, 'Murid tidak ditemukan');
    return student;
  },

  update(actorId: string, ip: string, id: string, input: { fullName?: string; classId?: number }) {
    if (!studentsRepository.existsMurid(id)) throw fail(404, 'Murid tidak ditemukan');
    if (input.classId !== undefined) {
      const cls = classesRepository.byId(input.classId);
      if (!cls || !cls.isActive) throw fail(400, 'Kelas tidak valid');
    }
    studentsRepository.update(id, input, now());
    authRepository.log(actorId, 'student_updated', ip, { studentId: id, ...input });
    return this.detail(id);
  },

  deactivate(actorId: string, ip: string, id: string) {
    if (!studentsRepository.existsMurid(id)) throw fail(404, 'Murid tidak ditemukan');
    // Nonaktifkan + cabut semua sesi refresh agar akses langsung berakhir.
    studentsRepository.deactivate(id, now());
    authRepository.revokeAllForUser.run({ userId: id, now: now() });
    authRepository.log(actorId, 'student_deactivated', ip, { studentId: id });
  },

  device(id: string) {
    if (!studentsRepository.existsMurid(id)) throw fail(404, 'Murid tidak ditemukan');
    const device = studentsRepository.deviceByUser(id);
    if (!device) throw fail(404, 'Perangkat belum terdaftar');
    return device;
  },

  resetDevice(actorId: string, ip: string, id: string) {
    if (!studentsRepository.existsMurid(id)) throw fail(404, 'Murid tidak ditemukan');
    if (!studentsRepository.deviceByUser(id)) throw fail(404, 'Perangkat belum terdaftar');
    studentsRepository.resetDevice(id, now());
    authRepository.log(actorId, 'device_reset', ip, { studentId: id });
  },

  // Import massal: validasi per baris (duplikat email/NIS, kelas tak dikenal),
  // buat akun aktif dengan sandi sementara. Gagal satu baris tidak menggugurkan lainnya.
  async import(actorId: string, ip: string, rows: ImportRow[]) {
    const classes = classesRepository.list();
    const classByName = new Map(classes.map((cls) => [cls.name.toLowerCase(), cls.id]));
    const existingEmails = new Set(studentsRepository.emailsByEmails(rows.map((row) => row.email)).map((row) => row.email));
    const existingNis = new Set(studentsRepository.nisByNis(rows.map((row) => row.nis)).map((row) => row.nis));

    const seenEmails = new Set<string>();
    const seenNis = new Set<string>();
    const credentials: Array<{ email: string; password: string; fullName: string }> = [];
    const failed: Array<{ row: number; name: string; reason: string }> = [];

    for (const [index, row] of rows.entries()) {
      const email = row.email.toLowerCase();
      if (existingEmails.has(email) || seenEmails.has(email)) {
        failed.push({ row: index + 1, name: row.fullName, reason: `Email ${email} sudah terdaftar` });
        continue;
      }
      if (existingNis.has(row.nis) || seenNis.has(row.nis)) {
        failed.push({ row: index + 1, name: row.fullName, reason: `NIS ${row.nis} sudah terdaftar` });
        continue;
      }
      let classId: number | null = null;
      if (row.className) {
        classId = classByName.get(row.className.toLowerCase()) ?? null;
        if (classId === null) {
          failed.push({ row: index + 1, name: row.fullName, reason: `Kelas "${row.className}" tidak ditemukan` });
          continue;
        }
      }

      const userId = newId();
      const password = `Muda-${newId().slice(0, 8)}`;
      studentsRepository.createStudent({
        id: userId,
        email,
        passwordHash: await hashPassword(password),
        fullName: row.fullName,
        nis: row.nis,
        classId,
        now: now(),
      });
      seenEmails.add(email);
      seenNis.add(row.nis);
      credentials.push({ email, password, fullName: row.fullName });
    }

    authRepository.log(actorId, 'students_imported', ip, { total: rows.length, created: credentials.length, failed: failed.length });
    return { created: credentials.length, failed, credentials };
  },
};
