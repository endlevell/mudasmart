import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db';
import { teacherProfiles, users } from '../db/schema';

const guruRows = () =>
  db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      isActive: users.isActive,
      isAdmin: teacherProfiles.isAdmin,
    })
    .from(users)
    .innerJoin(teacherProfiles, eq(teacherProfiles.userId, users.id))
    .where(eq(users.role, 'guru'))
    .orderBy(asc(users.fullName));

export const gurusRepository = {
  list() {
    return guruRows().all();
  },
  detail(id: string) {
    return db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        isActive: users.isActive,
        isAdmin: teacherProfiles.isAdmin,
      })
      .from(users)
      .innerJoin(teacherProfiles, eq(teacherProfiles.userId, users.id))
      .where(eq(users.id, id))
      .get();
  },
  byId(id: string) {
    return db
      .select({ id: users.id, role: users.role, isActive: users.isActive, isAdmin: teacherProfiles.isAdmin })
      .from(users)
      .leftJoin(teacherProfiles, eq(teacherProfiles.userId, users.id))
      .where(and(eq(users.id, id), eq(users.role, 'guru')))
      .get();
  },
  setAdmin(id: string, isAdmin: boolean, now: number) {
    db.update(teacherProfiles).set({ isAdmin, updatedAt: now }).where(eq(teacherProfiles.userId, id)).run();
  },
  deactivate(id: string, now: number) {
    db.update(users).set({ isActive: false, updatedAt: now }).where(eq(users.id, id)).run();
  },
};
