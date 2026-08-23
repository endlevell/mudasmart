import { and, eq, gt, isNull, or, sql } from 'drizzle-orm';
import { db } from '../db';
import { auditLogs, devices, refreshTokens, registrationCodes, studentProfiles, teacherProfiles, users } from '../db/schema';
import { id, type Role } from '../lib/auth';

const p = (name: string) => sql.placeholder(name) as any;
const userFields = { id: users.id, email: users.email, fullName: users.fullName, role: users.role, isActive: users.isActive, isAdmin: teacherProfiles.isAdmin };
const usableCode = and(eq(registrationCodes.code, p('code')), eq(registrationCodes.isActive, true), or(isNull(registrationCodes.maxUses), gt(registrationCodes.maxUses, registrationCodes.usedCount)), or(isNull(registrationCodes.expiresAt), gt(registrationCodes.expiresAt, p('now'))));
export const repository = {
  code: db.select().from(registrationCodes).where(usableCode).prepare(),
  userByEmail: db.select({ ...userFields, passwordHash: users.passwordHash }).from(users).leftJoin(teacherProfiles, eq(teacherProfiles.userId, users.id)).where(eq(users.email, p('email'))).prepare(),
  userWithHashById: db.select({ id: users.id, passwordHash: users.passwordHash }).from(users).where(eq(users.id, p('id'))).prepare(),
  updatePassword: db.update(users).set({ passwordHash: p('passwordHash'), updatedAt: p('now') }).where(eq(users.id, p('id'))).prepare(),
  userById: db.select(userFields).from(users).leftJoin(teacherProfiles, eq(teacherProfiles.userId, users.id)).where(eq(users.id, p('id'))).prepare(),
  activeUserById: db.select(userFields).from(users).leftJoin(teacherProfiles, eq(teacherProfiles.userId, users.id)).where(and(eq(users.id, p('id')), eq(users.isActive, true))).prepare(),
  deviceByUser: db.select().from(devices).where(eq(devices.userId, p('userId'))).prepare(),
  deviceById: db.select().from(devices).where(eq(devices.deviceId, p('deviceId'))).prepare(),
  refreshByHash: db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, p('tokenHash'))).prepare(),
  insertUser: db.insert(users).values({ id: p('id'), email: p('email'), passwordHash: p('passwordHash'), fullName: p('fullName'), role: p('role'), isActive: true, createdAt: p('now'), updatedAt: p('now') }).prepare(),
  insertStudent: db.insert(studentProfiles).values({ userId: p('userId'), nis: p('nis'), createdAt: p('now'), updatedAt: p('now') }).prepare(),
  insertTeacher: db.insert(teacherProfiles).values({ userId: p('userId'), nip: p('nip'), isAdmin: false, createdAt: p('now'), updatedAt: p('now') }).prepare(),
  useCode: db.update(registrationCodes).set({ usedCount: sql`${registrationCodes.usedCount} + 1`, updatedAt: p('now') }).where(usableCode).prepare(),
  insertDevice: db.insert(devices).values({ userId: p('userId'), deviceId: p('deviceId'), platform: p('platform'), model: p('model'), userAgent: p('userAgent'), createdAt: p('now'), updatedAt: p('now'), lastSeenAt: p('now') }).returning({ id: devices.id }).prepare(),
  touchDevice: db.update(devices).set({ deviceId: p('deviceId'), platform: p('platform'), model: p('model'), userAgent: p('userAgent'), updatedAt: p('now'), lastSeenAt: p('now') }).where(eq(devices.id, p('id'))).prepare(),
  touchDeviceAgent: db.update(devices).set({ userAgent: p('userAgent'), updatedAt: p('now'), lastSeenAt: p('now') }).where(eq(devices.id, p('id'))).prepare(),
  insertRefresh: db.insert(refreshTokens).values({ id: p('id'), userId: p('userId'), tokenHash: p('tokenHash'), familyId: p('familyId'), deviceId: p('deviceId'), expiresAt: p('expiresAt'), createdAt: p('now') }).prepare(),
  revokeToken: db.update(refreshTokens).set({ revokedAt: p('now') }).where(and(eq(refreshTokens.tokenHash, p('tokenHash')), isNull(refreshTokens.revokedAt))).prepare(),
  revokeFamily: db.update(refreshTokens).set({ revokedAt: p('now') }).where(and(eq(refreshTokens.familyId, p('familyId')), isNull(refreshTokens.revokedAt))).prepare(),
  revokeAllForUser: db.update(refreshTokens).set({ revokedAt: p('now') }).where(and(eq(refreshTokens.userId, p('userId')), isNull(refreshTokens.revokedAt))).prepare(),
  setPushToken(userId: string, token: string, now: number) {
    const rows = db.update(devices).set({ pushToken: token, updatedAt: now }).where(eq(devices.userId, userId)).returning({ userId: devices.userId }).all();
    return rows.length;
  },
  audit: db.insert(auditLogs).values({ id: p('id'), userId: p('userId'), action: p('action'), metadata: p('metadata'), ip: p('ip'), createdAt: p('now') }).prepare(),
  log(userId: string | null, action: string, ip: string, metadata?: Record<string, unknown>) { this.audit.run({ id: id(), userId, action, metadata: metadata ? JSON.stringify(metadata) : null, ip, now: Date.now() }); },
};
export type User = { id: string; email: string; fullName: string; role: Role; isActive: boolean; isAdmin: boolean | null };
