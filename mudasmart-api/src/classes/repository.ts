import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { classes, studentProfiles, users } from '../db/schema';

// Hitung murid aktif per kelas. Raw SQL murni (tanpa input user) — interpolasi kolom drizzle tidak memenuhi syarat di dalam subquery.
const studentCount = sql<number>`(select count(*) from student_profiles sp inner join users u on u.id = sp.user_id where sp.class_id = classes.id and u.is_active = 1)`;

const listSelect = {
  id: classes.id,
  name: classes.name,
  gradeLevel: classes.gradeLevel,
  academicYear: classes.academicYear,
  homeroomTeacherId: classes.homeroomTeacherId,
  isActive: classes.isActive,
  studentCount,
};

export const classesRepository = {
  list() {
    return db.select(listSelect).from(classes).orderBy(desc(classes.createdAt)).all();
  },
  byId(id: number) {
    return db.select(listSelect).from(classes).where(eq(classes.id, id)).get();
  },
  create(input: { name: string; gradeLevel: number; academicYear: string; homeroomTeacherId?: string | null }, now: number) {
    return db.insert(classes).values({ ...input, homeroomTeacherId: input.homeroomTeacherId ?? null, createdAt: now, updatedAt: now }).returning({ id: classes.id }).get();
  },
  update(id: number, input: Record<string, unknown>, now: number) {
    db.update(classes).set({ ...input, updatedAt: now }).where(eq(classes.id, id)).run();
  },
  activeStudents(classId: number) {
    return db
      .select({ id: users.id, fullName: users.fullName, nis: studentProfiles.nis })
      .from(studentProfiles)
      .innerJoin(users, eq(users.id, studentProfiles.userId))
      .where(and(eq(studentProfiles.classId, classId), eq(users.isActive, true)))
      .orderBy(users.fullName)
      .all();
  },
};
