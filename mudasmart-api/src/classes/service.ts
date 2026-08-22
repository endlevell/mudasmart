import { eq } from 'drizzle-orm';
import { repository as authRepository } from '../auth/repository';
import { db } from '../db';
import { users } from '../db/schema';
import { fail } from '../lib/http';
import { classesRepository } from './repository';

const now = () => Date.now();

const ensureHomeroomIsGuru = (teacherId?: string | null) => {
  if (teacherId === undefined) return;
  if (teacherId === null) return;
  const teacher = db.select({ role: users.role, isActive: users.isActive }).from(users).where(eq(users.id, teacherId)).get();
  if (!teacher || teacher.role !== 'guru' || !teacher.isActive) throw fail(400, 'Wali kelas harus guru aktif');
};

export const classesService = {
  list() {
    return classesRepository.list();
  },

  detail(id: number) {
    const cls = classesRepository.byId(id);
    if (!cls) throw fail(404, 'Kelas tidak ditemukan');
    return { ...cls, students: classesRepository.activeStudents(id) };
  },

  create(actorId: string, ip: string, input: { name: string; gradeLevel: number; academicYear: string; homeroomTeacherId?: string }) {
    ensureHomeroomIsGuru(input.homeroomTeacherId);
    const created = classesRepository.create(input, now());
    authRepository.log(actorId, 'class_created', ip, { classId: created!.id, name: input.name });
    return this.detail(created!.id);
  },

  update(actorId: string, ip: string, id: number, input: Record<string, unknown>) {
    if (!classesRepository.byId(id)) throw fail(404, 'Kelas tidak ditemukan');
    if ('homeroomTeacherId' in input) ensureHomeroomIsGuru(input.homeroomTeacherId as string | null | undefined);
    classesRepository.update(id, input, now());
    authRepository.log(actorId, 'class_updated', ip, { classId: id });
    return this.detail(id);
  },
};
