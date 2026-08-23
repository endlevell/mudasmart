import { and, asc, eq, gte, lt } from 'drizzle-orm';
import { db } from '../db';
import { attendanceRecords, classes, studentProfiles, users } from '../db/schema';
import { sessionsRepository } from '../sessions/service';
import { leavesRepository } from '../leaves/repository';

const WIB_OFFSET_MS = 7 * 3_600_000;
const dayRange = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  const startMs = Date.UTC(year, month - 1, day) - WIB_OFFSET_MS;
  return { startMs, endMs: startMs + 86_400_000 };
};
export const monthRange = (month: string) => {
  const [year, m] = month.split('-').map(Number);
  return { startMs: Date.UTC(year, m - 1, 1) - WIB_OFFSET_MS, endMs: Date.UTC(year, m, 1) - WIB_OFFSET_MS };
};

const activeStudents = (classId?: number) =>
  db
    .select({ id: users.id, fullName: users.fullName, nis: studentProfiles.nis, classId: studentProfiles.classId, className: classes.name })
    .from(studentProfiles)
    .innerJoin(users, eq(users.id, studentProfiles.userId))
    .leftJoin(classes, eq(classes.id, studentProfiles.classId))
    .where(classId ? and(eq(users.isActive, true), eq(users.role, 'murid'), eq(studentProfiles.classId, classId)) : and(eq(users.isActive, true), eq(users.role, 'murid')))
    .orderBy(asc(classes.name), asc(users.fullName))
    .all();

export const reportsRepository = {
  activeStudents,
  recordsForSession(sessionId: number) {
    return db.select({ id: attendanceRecords.id, studentId: attendanceRecords.studentId, status: attendanceRecords.status, scannedAt: attendanceRecords.scannedAt }).from(attendanceRecords).where(eq(attendanceRecords.sessionId, sessionId)).all();
  },
  recordsInRange(startMs: number, endMs: number) {
    return db.select({ studentId: attendanceRecords.studentId, status: attendanceRecords.status, scannedAt: attendanceRecords.scannedAt }).from(attendanceRecords).where(and(gte(attendanceRecords.scannedAt, startMs), lt(attendanceRecords.scannedAt, endMs))).all();
  },
  sessionByDate: (date: string) => sessionsRepository.byDate(date),
  sessionDates: (prefix: string) => sessionsRepository.sessionDates(prefix),
  approvedLeavesOn: (date: string) => leavesRepository.approvedBetween(Date.parse(`${date}T00:00:00+07:00`), Date.parse(`${date}T00:00:00+07:00`) + 86_400_000),
  approvedLeavesInRange: (startMs: number, endMs: number) => leavesRepository.approvedBetween(startMs, endMs),
};
