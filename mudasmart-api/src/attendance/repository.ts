import { and, asc, count, desc, eq, gte, isNull, lt } from 'drizzle-orm';
import { db } from '../db';
import { attendanceRecords, attendanceSessions, devices, gates, studentProfiles, users } from '../db/schema';

export const attendanceRepository = {
  recordByNonce(sessionId: number, clientNonce: string) {
    return db.select().from(attendanceRecords).where(and(eq(attendanceRecords.sessionId, sessionId), eq(attendanceRecords.clientNonce, clientNonce))).get();
  },
  recordByStudent(sessionId: number, studentId: string) {
    return db.select().from(attendanceRecords).where(and(eq(attendanceRecords.sessionId, sessionId), eq(attendanceRecords.studentId, studentId))).get();
  },
  byId(recordId: number) {
    return db.select().from(attendanceRecords).where(eq(attendanceRecords.id, recordId)).get();
  },
  deleteById(recordId: number) {
    db.delete(attendanceRecords).where(eq(attendanceRecords.id, recordId)).run();
  },
  todayRecord(studentId: string, date: string) {
    return db
      .select({ status: attendanceRecords.status, scannedAt: attendanceRecords.scannedAt })
      .from(attendanceRecords)
      .innerJoin(attendanceSessions, eq(attendanceSessions.id, attendanceRecords.sessionId))
      .where(and(eq(attendanceRecords.studentId, studentId), eq(attendanceSessions.date, date)))
      .get();
  },
  insert(values: typeof attendanceRecords.$inferInsert) {
    return db.insert(attendanceRecords).values(values).returning({ id: attendanceRecords.id }).get();
  },
  async history(studentId: string, range: { startMs: number; endMs: number; limit: number; offset: number }) {
    const where = and(eq(attendanceRecords.studentId, studentId), gte(attendanceRecords.scannedAt, range.startMs), lt(attendanceRecords.scannedAt, range.endMs));
    const data = await db
      .select({ id: attendanceRecords.id, scannedAt: attendanceRecords.scannedAt, status: attendanceRecords.status, gateName: gates.name })
      .from(attendanceRecords)
      .innerJoin(gates, eq(gates.id, attendanceRecords.gateId))
      .where(where)
      .orderBy(desc(attendanceRecords.scannedAt))
      .limit(range.limit)
      .offset(range.offset);
    const [{ total }] = await db.select({ total: count() }).from(attendanceRecords).where(where);
    return { data, total };
  },
  sessionDates(prefix: string) {
    return db.select({ date: attendanceSessions.date }).from(attendanceSessions).orderBy(asc(attendanceSessions.date)).all().filter((row) => row.date.startsWith(prefix)).map((row) => row.date);
  },
  classIdOf(studentId: string) {
    return db.select({ classId: studentProfiles.classId }).from(studentProfiles).where(eq(studentProfiles.userId, studentId)).get()?.classId ?? null;
  },
  // Murid aktif yang belum scan pada sesi tsb (+ token push bila ada).
  muridsWithoutRecord(sessionId: number) {
    return db
      .select({ id: users.id, token: devices.pushToken })
      .from(users)
      .leftJoin(attendanceRecords, and(eq(attendanceRecords.studentId, users.id), eq(attendanceRecords.sessionId, sessionId)))
      .leftJoin(devices, eq(devices.userId, users.id))
      .where(and(eq(users.role, 'murid'), eq(users.isActive, true), isNull(attendanceRecords.id)))
      .all();
  },
};
