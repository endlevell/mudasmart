import { and, asc, count, eq, like, or, sql } from 'drizzle-orm';
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
    if (filters.q) conditions.push(or(like(users.fullName, `%${filters.q}%`), like(studentProfiles.nis, `%${filters.q}%`))!);
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
};
