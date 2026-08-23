import { and, asc, count, eq, inArray, like, or, sql } from 'drizzle-orm';
import { db } from '../db';
import { classes, devices, studentProfiles, users } from '../db/schema';

const listSelect = {
  id: users.id,
  email: users.email,
  fullName: users.fullName,
  nis: studentProfiles.nis,
  classId: studentProfiles.classId,
  className: classes.name,
};

const baseQuery = () =>
  db.select(listSelect)
    .from(users)
    .innerJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .leftJoin(classes, eq(classes.id, studentProfiles.classId));

export const studentsRepository = {
  // Filter dinamis lewat builder Drizzle — nilai selalu bound parameter, tanpa string SQL mentah.
  async list(filters: { q?: string; classId?: number; limit: number; offset: number }) {
    const conditions = [eq(users.isActive, true), eq(users.role, 'murid')];
    if (filters.q) {
      // Buang wildcard LIKE agar input user tidak bisa menyusun pola pencarian liar.
      const term = filters.q.replace(/[%_]/g, '');
      conditions.push(or(like(users.fullName, `%${term}%`), like(studentProfiles.nis, `%${term}%`))!);
    }
    if (filters.classId) conditions.push(eq(studentProfiles.classId, filters.classId));
    const where = and(...conditions);
    const data = await baseQuery().where(where).orderBy(asc(users.fullName)).limit(filters.limit).offset(filters.offset);
    const [{ total }] = await db.select({ total: count() }).from(users).innerJoin(studentProfiles, eq(studentProfiles.userId, users.id)).where(where);
    return { data, total };
  },
  byId(id: string) {
    return baseQuery().where(and(eq(users.id, id), eq(users.role, 'murid'))).get();
  },
  existsMurid(id: string) {
    return db.select({ id: users.id }).from(users).where(and(eq(users.id, id), eq(users.role, 'murid'))).get();
  },
  update(id: string, input: { fullName?: string; classId?: number }, now: number) {
    if (input.fullName !== undefined) db.update(users).set({ fullName: input.fullName, updatedAt: now }).where(eq(users.id, id)).run();
    if (input.classId !== undefined) db.update(studentProfiles).set({ classId: input.classId, updatedAt: now }).where(eq(studentProfiles.userId, id)).run();
  },
  deactivate(id: string, now: number) {
    db.update(users).set({ isActive: false, updatedAt: now }).where(eq(users.id, id)).run();
  },
  deviceByUser(userId: string) {
    return db.select().from(devices).where(eq(devices.userId, userId)).get();
  },
  resetDevice(userId: string, now: number) {
    db.update(devices).set({ deviceId: null, resetCount: sql`${devices.resetCount} + 1`, updatedAt: now }).where(eq(devices.userId, userId)).run();
  },
  // ===== Import massal =====
  emailsByEmails(emails: string[]) {
    return db.select({ email: users.email }).from(users).where(inArray(users.email, emails)).all();
  },
  nisByNis(nisList: string[]) {
    return db.select({ nis: studentProfiles.nis }).from(studentProfiles).where(inArray(studentProfiles.nis, nisList)).all();
  },
  classByName(name: string) {
    return db.select({ id: classes.id }).from(classes).where(eq(classes.name, name)).get();
  },
  createStudent(input: { id: string; email: string; passwordHash: string; fullName: string; nis: string; classId: number | null; now: number }) {
    db.transaction(() => {
      db.insert(users).values({ id: input.id, email: input.email, passwordHash: input.passwordHash, fullName: input.fullName, role: 'murid', isActive: true, createdAt: input.now, updatedAt: input.now }).run();
      db.insert(studentProfiles).values({ userId: input.id, nis: input.nis, classId: input.classId, createdAt: input.now, updatedAt: input.now }).run();
    });
  },
};
