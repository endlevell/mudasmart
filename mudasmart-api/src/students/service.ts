import { repository as authRepository } from '../auth/repository';
import { fail } from '../lib/http';
import { classesRepository } from '../classes/repository';
import { studentsRepository } from './repository';

const now = () => Date.now();

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
};
