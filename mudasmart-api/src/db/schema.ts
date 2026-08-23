import { integer, real, sqliteTable, text, uniqueIndex, index, check } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', { id: text().primaryKey(), email: text().notNull().unique(), passwordHash: text('password_hash').notNull(), fullName: text('full_name').notNull(), role: text({ enum: ['murid', 'guru'] }).notNull(), isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true), createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull() }, (table) => [check('users_role_check', sql`${table.role} in ('murid', 'guru')`)]);
export const classes = sqliteTable('classes', { id: integer().primaryKey({ autoIncrement: true }), name: text().notNull(), gradeLevel: integer().notNull(), academicYear: text('academic_year').notNull(), homeroomTeacherId: text('homeroom_teacher_id').references(() => users.id), isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true), createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull() }, (table) => [index('classes_academic_year_idx').on(table.academicYear, table.isActive)]);
export const studentProfiles = sqliteTable('student_profiles', { userId: text('user_id').primaryKey().references(() => users.id), nis: text().notNull().unique(), classId: integer('class_id').references(() => classes.id), createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull() });
export const teacherProfiles = sqliteTable('teacher_profiles', { userId: text('user_id').primaryKey().references(() => users.id), nip: text().unique(), isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false), createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull() });
export const registrationCodes = sqliteTable('registration_codes', { code: text().primaryKey(), roleAllowed: text('role_allowed', { enum: ['murid', 'guru'] }).notNull(), isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true), maxUses: integer('max_uses'), usedCount: integer('used_count').notNull().default(0), expiresAt: integer('expires_at'), createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull() }, (table) => [check('registration_codes_role_allowed_check', sql`${table.roleAllowed} in ('murid', 'guru')`)]);
// deviceId TIDAK unik global — satu HP boleh dipakai beberapa akun (mis. murid + guru).
// Yang dijamin unik: satu user punya satu baris device (uniqueIndex di user_id).
export const devices = sqliteTable('devices', { id: integer().primaryKey({ autoIncrement: true }), userId: text('user_id').notNull().references(() => users.id), deviceId: text('device_id'), platform: text(), model: text(), userAgent: text('user_agent').notNull(), resetCount: integer('reset_count').notNull().default(0), createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull(), lastSeenAt: integer('last_seen_at').notNull() });
export const refreshTokens = sqliteTable('refresh_tokens', { id: text().primaryKey(), userId: text('user_id').notNull().references(() => users.id), tokenHash: text('token_hash').notNull().unique(), familyId: text('family_id').notNull(), deviceId: integer('device_id').notNull().references(() => devices.id), expiresAt: integer('expires_at').notNull(), revokedAt: integer('revoked_at'), createdAt: integer('created_at').notNull() });
export const auditLogs = sqliteTable('audit_logs', { id: text().primaryKey(), userId: text('user_id').references(() => users.id), action: text().notNull(), metadata: text(), ip: text(), createdAt: integer('created_at').notNull() });
export const gates = sqliteTable('gates', { id: integer().primaryKey({ autoIncrement: true }), name: text().notNull(), qrCodeValue: text('qr_code_value').notNull().unique(), latitude: real(), longitude: real(), radiusMeters: integer('radius_meters'), isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true), createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull() });
export const attendanceConfig = sqliteTable('attendance_config', { id: integer().primaryKey({ autoIncrement: true }), checkInStart: text('check_in_start').notNull(), onTimeCutoff: text('on_time_cutoff').notNull(), checkInEnd: text('check_in_end').notNull(), updatedBy: text('updated_by').references(() => users.id), updatedAt: integer('updated_at').notNull() });
export const attendanceSessions = sqliteTable('attendance_sessions', { id: integer().primaryKey({ autoIncrement: true }), date: text().notNull().unique(), openedBy: text('opened_by').notNull().references(() => users.id), openedAt: integer('opened_at').notNull(), closedBy: text('closed_by').references(() => users.id), closedAt: integer('closed_at'), status: text({ enum: ['open', 'closed'] }).notNull(), createdAt: integer('created_at').notNull() }, (table) => [check('attendance_sessions_status_check', sql`${table.status} in ('open', 'closed')`)]);
export const attendanceRecords = sqliteTable('attendance_records', { id: integer().primaryKey({ autoIncrement: true }), sessionId: integer('session_id').notNull().references(() => attendanceSessions.id), studentId: text('student_id').notNull().references(() => users.id), classIdSnapshot: integer('class_id_snapshot').notNull().references(() => classes.id), gateId: integer('gate_id').notNull().references(() => gates.id), deviceId: integer('device_id').notNull().references(() => devices.id), scannedAt: integer('scanned_at').notNull(), status: text({ enum: ['hadir', 'telat'] }).notNull(), latitude: real(), longitude: real(), geofencePassed: integer('geofence_passed', { mode: 'boolean' }), clientNonce: text('client_nonce').notNull().unique() }, (table) => [uniqueIndex('attendance_session_student_unique').on(table.sessionId, table.studentId), index('attendance_student_scanned_idx').on(table.studentId, table.scannedAt), index('attendance_class_snapshot_idx').on(table.classIdSnapshot, table.scannedAt)]);
// Izin/sakit per tanggal — disetujui guru menjadikan status 'izin' pada hari tsb
// (record scan tetap menang bila murid ternyata datang).
export const leaveRequests = sqliteTable('leave_requests', {
  id: integer().primaryKey({ autoIncrement: true }),
  studentId: text('student_id').notNull().references(() => users.id),
  date: text().notNull(),
  type: text({ enum: ['sakit', 'izin'] }).notNull(),
  reason: text().notNull(),
  imagePath: text('image_path'),
  status: text({ enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  createdBy: text('created_by').notNull().references(() => users.id),
  reviewedBy: text('reviewed_by').references(() => users.id),
  reviewedAt: integer('reviewed_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  uniqueIndex('leave_requests_student_date_unique').on(table.studentId, table.date),
  check('leave_requests_type_check', sql`${table.type} in ('sakit', 'izin')`),
  check('leave_requests_status_check', sql`${table.status} in ('pending', 'approved', 'rejected')`),
]);
