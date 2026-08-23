import { and, desc, eq, gte, lt } from 'drizzle-orm';
import { db } from '../db';
import { classes, leaveRequests, studentProfiles, users } from '../db/schema';

const wibDateOf = (ms: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(ms));

export const leavesRepository = {
  byId(id: number) {
    return db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).get();
  },
  byStudentAndDate(studentId: string, date: string) {
    return db.select().from(leaveRequests).where(and(eq(leaveRequests.studentId, studentId), eq(leaveRequests.date, date))).get();
  },
  insert(values: typeof leaveRequests.$inferInsert) {
    return db.insert(leaveRequests).values(values).returning({ id: leaveRequests.id }).get();
  },
  mine(studentId: string) {
    return db.select().from(leaveRequests).where(eq(leaveRequests.studentId, studentId)).orderBy(desc(leaveRequests.createdAt)).all();
  },
  list(status?: 'pending' | 'approved' | 'rejected') {
    const base = db
      .select({
        id: leaveRequests.id,
        studentId: leaveRequests.studentId,
        fullName: users.fullName,
        nis: studentProfiles.nis,
        className: classes.name,
        date: leaveRequests.date,
        type: leaveRequests.type,
        reason: leaveRequests.reason,
        imagePath: leaveRequests.imagePath,
        status: leaveRequests.status,
        createdAt: leaveRequests.createdAt,
      })
      .from(leaveRequests)
      .innerJoin(users, eq(users.id, leaveRequests.studentId))
      .leftJoin(studentProfiles, eq(studentProfiles.userId, leaveRequests.studentId))
      .leftJoin(classes, eq(classes.id, studentProfiles.classId));
    return (status ? base.where(eq(leaveRequests.status, status)) : base).orderBy(desc(leaveRequests.createdAt)).limit(100).all();
  },
  review(id: number, status: 'approved' | 'rejected', reviewedBy: string, reviewedAt: number) {
    db.update(leaveRequests).set({ status, reviewedBy, reviewedAt, updatedAt: reviewedAt }).where(eq(leaveRequests.id, id)).run();
  },
  approvedBetween(startMs: number, endMs: number) {
    // Tanggal disimpan sebagai string YYYY-MM-DD (WIB); filter via perbandingan string.
    return db
      .select({ studentId: leaveRequests.studentId, date: leaveRequests.date, type: leaveRequests.type })
      .from(leaveRequests)
      .where(and(eq(leaveRequests.status, 'approved'), gte(leaveRequests.date, wibDateOf(startMs)), lt(leaveRequests.date, wibDateOf(endMs))))
      .all();
  },
};
