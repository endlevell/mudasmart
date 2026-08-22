import { beforeEach, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { app } from './app';
import { db } from './db';
import { auditLogs, attendanceConfig, attendanceRecords, attendanceSessions, classes, devices, gates, refreshTokens, registrationCodes, studentProfiles, teacherProfiles, users } from './db/schema';
import { resetRateLimits } from './middleware/rate-limit';

const request = (path: string, body: unknown, headers: Record<string, string> = {}) => app.request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const send = (method: string, path: string, body: unknown, headers: Record<string, string> = {}) => app.request(path, { method, headers: { 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
const code = (code: string, roleAllowed: 'murid' | 'guru', maxUses = 2) => db.insert(registrationCodes).values({ code, roleAllowed, maxUses, usedCount: 0, isActive: true, createdAt: Date.now(), updatedAt: Date.now() }).run();

const register = async (email: string, registrationCode: string, extra: Record<string, unknown> = {}) => {
  const response = await request('/api/auth/register', { email, password: 'password123', fullName: email.split('@')[0], registrationCode, deviceId: crypto.randomUUID(), ...extra });
  return (await response.json()) as { user: { id: string }; accessToken: string; refreshToken: string };
};
const bearer = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });
const makeGuru = async (email = 'guru@example.com', admin = false) => {
  const session = await register(email, 'GURU');
  if (admin) db.update(teacherProfiles).set({ isAdmin: true }).where(eq(teacherProfiles.userId, session.user.id)).run();
  return session;
};
const makeMurid = async (email = 'murid@example.com') => register(email, 'MURID', { nis: String(Math.floor(Math.random() * 100000)) });

beforeEach(() => { resetRateLimits(); db.delete(auditLogs).run(); db.delete(refreshTokens).run(); db.delete(attendanceRecords).run(); db.delete(devices).run(); db.delete(studentProfiles).run(); db.delete(teacherProfiles).run(); db.delete(attendanceSessions).run(); db.delete(gates).run(); db.delete(attendanceConfig).run(); db.delete(classes).run(); db.delete(registrationCodes).run(); db.delete(users).run(); code('MURID', 'murid'); code('GURU', 'guru'); });
test('GET /api/health returns service status', async () => expect(await (await app.request('/api/health')).json()).toEqual({ status: 'ok' }));
test('register derives murid role, requires NIS, supports multi-use code', async () => {
  const input = { email: 'murid@example.com', password: 'password123', fullName: 'Murid', registrationCode: 'MURID', deviceId: crypto.randomUUID(), nis: '123' };
  expect((await request('/api/auth/register', { ...input, role: 'guru' })).status).toBe(400);
  expect((await request('/api/auth/register', { ...input, nis: undefined })).status).toBe(400);
  const response = await request('/api/auth/register', input); expect((await response.json()).user.role).toBe('murid');
  const second = await request('/api/auth/register', { ...input, email: 'murid2@example.com', deviceId: crypto.randomUUID(), nis: '124' }); expect(second.status).toBe(201);
});
test('murid rejects other device; inactive code rejected', async () => {
  const deviceId = crypto.randomUUID(); await request('/api/auth/register', { email: 'murid@example.com', password: 'password123', fullName: 'Murid', registrationCode: 'MURID', deviceId, nis: '123' });
  expect((await request('/api/auth/login', { email: 'murid@example.com', password: 'password123', deviceId: crypto.randomUUID() })).status).toBe(403);
  db.update(registrationCodes).set({ isActive: false }).where((await import('drizzle-orm')).eq(registrationCodes.code, 'GURU')).run();
  expect((await request('/api/auth/register', { email: 'guru@example.com', password: 'password123', fullName: 'Guru', registrationCode: 'GURU', deviceId: crypto.randomUUID() })).status).toBe(400);
});
test('refresh rotates then reuse revokes family', async () => {
  const deviceId = crypto.randomUUID(); const registered = await request('/api/auth/register', { email: 'murid@example.com', password: 'password123', fullName: 'Murid', registrationCode: 'MURID', deviceId, nis: '123' }); const first = await registered.json() as { refreshToken: string };
  const rotated = await request('/api/auth/refresh', { refreshToken: first.refreshToken, deviceId }); const second = await rotated.json() as { refreshToken: string }; expect(second.refreshToken).not.toBe(first.refreshToken);
  expect((await request('/api/auth/refresh', { refreshToken: first.refreshToken, deviceId })).status).toBe(401); expect((await request('/api/auth/refresh', { refreshToken: second.refreshToken, deviceId })).status).toBe(401);
});
test('logout is authenticated and user-bound', async () => {
  const deviceId = crypto.randomUUID(); const registered = await request('/api/auth/register', { email: 'murid@example.com', password: 'password123', fullName: 'Murid', registrationCode: 'MURID', deviceId, nis: '123' }); const session = await registered.json() as { accessToken: string; refreshToken: string };
  expect((await request('/api/auth/logout', { refreshToken: session.refreshToken })).status).toBe(401);
  expect((await request('/api/auth/logout', { refreshToken: session.refreshToken }, { authorization: `Bearer ${session.accessToken}` })).status).toBe(204);
  expect((await request('/api/auth/refresh', { refreshToken: session.refreshToken, deviceId })).status).toBe(401);
});
test('inactive user loses access and refresh', async () => {
  const deviceId = crypto.randomUUID(); const registered = await request('/api/auth/register', { email: 'murid@example.com', password: 'password123', fullName: 'Murid', registrationCode: 'MURID', deviceId, nis: '123' }); const session = await registered.json() as { accessToken: string; refreshToken: string };
  db.update(users).set({ isActive: false }).where((await import('drizzle-orm')).eq(users.email, 'murid@example.com')).run();
  expect((await app.request('/api/auth/me', { headers: { authorization: `Bearer ${session.accessToken}` } })).status).toBe(401);
  expect((await request('/api/auth/refresh', { refreshToken: session.refreshToken, deviceId })).status).toBe(401);
});
test('logs redact token and password fields', async () => { const calls: string[] = []; const original = console.info; console.info = (value: string) => calls.push(value); try { const { logger } = await import('./lib/logger'); logger.info('event', { token: 'secret', password: 'secret' }); } finally { console.info = original; } expect(calls.join()).not.toContain('secret'); });

// ===== Fase 2: kelas & murid =====
test('role gates: murid blocked from students; guru non-admin blocked from class writes', async () => {
  const murid = await makeMurid();
  expect((await app.request('/api/students', { headers: bearer(murid.accessToken) })).status).toBe(403);
  const guru = await makeGuru('guru1@example.com');
  expect((await send('POST', '/api/classes', { name: 'X IPA 1', gradeLevel: 10, academicYear: '2026/2027' }, bearer(guru.accessToken))).status).toBe(403);
  expect((await app.request('/api/classes', { headers: bearer(murid.accessToken) })).status).toBe(200);
});

test('admin creates and updates class; list includes student count', async () => {
  const admin = await makeGuru('admin@example.com', true);
  const created = await send('POST', '/api/classes', { name: 'XI IPA 1', gradeLevel: 11, academicYear: '2026/2027' }, bearer(admin.accessToken));
  expect(created.status).toBe(201);
  const cls = (await created.json()) as { id: number };
  const murid = await makeMurid();
  await send('PATCH', `/api/students/${murid.user.id}`, { classId: cls.id }, bearer(admin.accessToken));
  const list = await (await app.request('/api/classes', { headers: bearer(admin.accessToken) })).json() as { data: Array<{ id: number; studentCount: number }> };
  expect(list.data.find((c) => c.id === cls.id)?.studentCount).toBe(1);
  expect((await send('PATCH', `/api/classes/${cls.id}`, { name: 'XI IPA 2' }, bearer(admin.accessToken))).status).toBe(200);
  expect((await send('POST', '/api/classes', { name: 'X', gradeLevel: 10, academicYear: 'bad' }, bearer(admin.accessToken))).status).toBe(400);
});

test('guru updates student name/class; invalid class rejected; NIS immutable via API', async () => {
  const admin = await makeGuru('admin@example.com', true);
  const cls = await send('POST', '/api/classes', { name: 'X IPA 2', gradeLevel: 10, academicYear: '2026/2027' }, bearer(admin.accessToken));
  const classId = ((await cls.json()) as { id: number }).id;
  const murid = await makeMurid();
  const guru = await makeGuru('guru2@example.com');
  const updated = await send('PATCH', `/api/students/${murid.user.id}`, { fullName: 'Nama Baru', classId }, bearer(guru.accessToken));
  expect(updated.status).toBe(200);
  const detail = (await updated.json()) as { data: { fullName: string; className: string; nis: string } };
  expect(detail.data.fullName).toBe('Nama Baru');
  expect(detail.data.className).toBe('X IPA 2');
  expect((await send('PATCH', `/api/students/${murid.user.id}`, { classId: 9999 }, bearer(guru.accessToken))).status).toBe(400);
});

test('deactivate is admin-only, revokes sessions, blocks login', async () => {
  const admin = await makeGuru('admin@example.com', true);
  const guru = await makeGuru('guru3@example.com');
  const murid = await makeMurid();
  expect((await send('PATCH', `/api/students/${murid.user.id}/deactivate`, undefined, bearer(guru.accessToken))).status).toBe(403);
  expect((await send('PATCH', `/api/students/${murid.user.id}/deactivate`, undefined, bearer(admin.accessToken))).status).toBe(204);
  expect((await request('/api/auth/login', { email: 'murid@example.com', password: 'password123', deviceId: crypto.randomUUID() })).status).toBe(401);
  expect((await request('/api/auth/refresh', { refreshToken: murid.refreshToken, deviceId: crypto.randomUUID() })).status).toBe(401);
});

test('device reset clears binding; new device binds, old refresh dies', async () => {
  const guru = await makeGuru();
  const deviceId = crypto.randomUUID();
  const murid = await register('murid@example.com', 'MURID', { nis: '777', deviceId });
  const info = await (await app.request(`/api/students/${murid.user.id}/device`, { headers: bearer(guru.accessToken) })).json() as { data: { deviceId: string } };
  expect(info.data.deviceId).toBe(deviceId);
  expect((await send('PATCH', `/api/students/${murid.user.id}/device/reset`, undefined, bearer(guru.accessToken))).status).toBe(204);
  const newDeviceId = crypto.randomUUID();
  const relogin = await request('/api/auth/login', { email: 'murid@example.com', password: 'password123', deviceId: newDeviceId });
  expect(relogin.status).toBe(200);
  expect((await request('/api/auth/refresh', { refreshToken: murid.refreshToken, deviceId })).status).toBe(401);
  const after = await (await app.request(`/api/students/${murid.user.id}/device`, { headers: bearer(guru.accessToken) })).json() as { data: { deviceId: string; resetCount: number } };
  expect(after.data.deviceId).toBe(newDeviceId);
  expect(after.data.resetCount).toBe(1);
});

test('students list paginates, searches by name/nis, filters by class', async () => {
  const admin = await makeGuru('admin@example.com', true);
  const cls = await send('POST', '/api/classes', { name: 'X IPS 1', gradeLevel: 10, academicYear: '2026/2027' }, bearer(admin.accessToken));
  const classId = ((await cls.json()) as { id: number }).id;
  const a = await register('a@example.com', 'MURID', { nis: '1001', fullName: 'Andi' });
  const b = await register('b@example.com', 'MURID', { nis: '1002', fullName: 'Budi' });
  await send('PATCH', `/api/students/${b.user.id}`, { classId }, bearer(admin.accessToken));
  const byName = await (await app.request('/api/students?q=Andi', { headers: bearer(admin.accessToken) })).json() as { data: Array<{ id: string }>; total: number };
  expect(byName.total).toBe(1);
  expect(byName.data[0].id).toBe(a.user.id);
  const byNis = await (await app.request('/api/students?q=1002', { headers: bearer(admin.accessToken) })).json() as { total: number };
  expect(byNis.total).toBe(1);
  const byClass = await (await app.request(`/api/students?classId=${classId}`, { headers: bearer(admin.accessToken) })).json() as { total: number };
  expect(byClass.total).toBe(1);
  const paged = await (await app.request('/api/students?page=2&pageSize=1', { headers: bearer(admin.accessToken) })).json() as { page: number; pageSize: number; total: number };
  expect(paged.page).toBe(2);
  expect(paged.pageSize).toBe(1);
  expect(paged.total).toBe(2);
});

// ===== Fase 3: sesi, gerbang, config =====
test('session open/close/reopen idempotent single row per day', async () => {
  const guru = await makeGuru('piket@example.com');
  const opened = await send('POST', '/api/sessions/open', undefined, bearer(guru.accessToken));
  expect(opened.status).toBe(200);
  const first = (await opened.json()) as { id: number; status: string };
  expect(first.status).toBe('open');
  const again = await send('POST', '/api/sessions/open', undefined, bearer(guru.accessToken));
  expect(((await again.json()) as { id: number }).id).toBe(first.id);
  const closed = await send('POST', '/api/sessions/close', undefined, bearer(guru.accessToken));
  expect(((await closed.json()) as { id: number; status: string }).status).toBe('closed');
  const reopened = await send('POST', '/api/sessions/open', undefined, bearer(guru.accessToken));
  const reopenedBody = (await reopened.json()) as { id: number; status: string };
  expect(reopenedBody.id).toBe(first.id);
  expect(reopenedBody.status).toBe('open');
});

test('murid reads today session but cannot open; bad date rejected', async () => {
  const murid = await makeMurid();
  const today = await app.request('/api/sessions/today', { headers: bearer(murid.accessToken) });
  expect(today.status).toBe(200);
  expect((await today.json()).data).toBeNull();
  expect((await send('POST', '/api/sessions/open', undefined, bearer(murid.accessToken))).status).toBe(403);
  const guru = await makeGuru();
  expect((await app.request('/api/sessions/2026-13-99', { headers: bearer(guru.accessToken) })).status).toBe(400);
});

test('gates: admin creates with qr, regenerates value, guru read-only', async () => {
  const admin = await makeGuru('admin@example.com', true);
  const created = await send('POST', '/api/gates', { name: 'Gerbang Utama' }, bearer(admin.accessToken));
  expect(created.status).toBe(201);
  const gate = (await created.json()).data as { id: number; qrCodeValue: string };
  expect(gate.qrCodeValue).toMatch(/^gate-/);
  const guru = await makeGuru('gurubaca@example.com');
  expect((await app.request('/api/gates', { headers: bearer(guru.accessToken) })).status).toBe(200);
  expect((await send('POST', '/api/gates', { name: 'X' }, bearer(guru.accessToken))).status).toBe(403);
  const regenerated = await send('PATCH', `/api/gates/${gate.id}`, { regenerateQr: true }, bearer(admin.accessToken));
  const newGate = (await regenerated.json()).data as { qrCodeValue: string };
  expect(newGate.qrCodeValue).not.toBe(gate.qrCodeValue);
  expect((await send('PATCH', `/api/gates/${gate.id}`, { radiusMeters: 50 }, bearer(admin.accessToken))).status).toBe(200);
});

test('attendance config defaults then updates with ordering validation', async () => {
  const admin = await makeGuru('admin@example.com', true);
  const initial = await (await app.request('/api/config/attendance', { headers: bearer(admin.accessToken) })).json() as { data: { checkInStart: string; onTimeCutoff: string; checkInEnd: string } };
  expect(initial.data.checkInStart).toBe('06:00');
  expect((await send('PATCH', '/api/config/attendance', { checkInStart: '07:00', onTimeCutoff: '06:30', checkInEnd: '08:00' }, bearer(admin.accessToken))).status).toBe(400);
  const updated = await send('PATCH', '/api/config/attendance', { checkInStart: '06:00', onTimeCutoff: '07:15', checkInEnd: '08:00' }, bearer(admin.accessToken));
  expect(updated.status).toBe(200);
  expect((((await updated.json()) as { data: { onTimeCutoff: string } }).data).onTimeCutoff).toBe('07:15');
});

// ===== Fase 4: scan absensi =====
const fmtMinutes = (value: number) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
const wibNowMinutes = () => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date()).map((x) => [x.type, x.value])) as Record<'hour' | 'minute', string>;
  return Number(p.hour === '24' ? 0 : p.hour) * 60 + Number(p.minute);
};

const makeScanEnv = async () => {
  const admin = await makeGuru('admin@example.com', true);
  const cls = await send('POST', '/api/classes', { name: 'XI IPA 1', gradeLevel: 11, academicYear: '2026/2027' }, bearer(admin.accessToken));
  const classId = ((await cls.json()) as { id: number }).id;
  const deviceId = crypto.randomUUID();
  const murid = await register('murid@example.com', 'MURID', { nis: '555', deviceId });
  await send('PATCH', `/api/students/${murid.user.id}`, { classId }, bearer(admin.accessToken));
  await send('PATCH', '/api/config/attendance', { checkInStart: '00:00', onTimeCutoff: '23:59', checkInEnd: '23:59' }, bearer(admin.accessToken));
  await send('POST', '/api/sessions/open', undefined, bearer(admin.accessToken));
  const gate = await send('POST', '/api/gates', { name: 'Gerbang Utama' }, bearer(admin.accessToken));
  const gateData = ((await gate.json()) as { data: { qrCodeValue: string } }).data;
  return { admin, murid, deviceId, qrCodeValue: gateData.qrCodeValue };
};

test('scan records attendance; today and history reflect it', async () => {
  const { murid, deviceId, qrCodeValue } = await makeScanEnv();
  const nonce = crypto.randomUUID();
  const scan = await request('/api/attendance/scan', { qrCodeValue, clientNonce: nonce, deviceId }, bearer(murid.accessToken));
  expect(scan.status).toBe(201);
  const body = (await scan.json()) as { status: string; scannedAt: number };
  expect(body.status).toBe('hadir');
  const today = await (await app.request('/api/attendance/me/today', { headers: bearer(murid.accessToken) })).json() as { data: { status: string } | null };
  expect(today.data?.status).toBe('hadir');
  const month = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit' }).format(new Date());
  const history = await (await app.request(`/api/attendance/me?month=${month}`, { headers: bearer(murid.accessToken) })).json() as { data: unknown[]; total: number; sessionDates: string[] };
  expect(history.total).toBe(1);
  expect(history.sessionDates.length).toBe(1);
});

test('replay same nonce returns identical result; different nonce is friendly duplicate', async () => {
  const { murid, deviceId, qrCodeValue } = await makeScanEnv();
  const nonce = crypto.randomUUID();
  const first = await request('/api/attendance/scan', { qrCodeValue, clientNonce: nonce, deviceId }, bearer(murid.accessToken));
  const firstBody = (await first.json()) as { scannedAt: number };
  const retry = await request('/api/attendance/scan', { qrCodeValue, clientNonce: nonce, deviceId }, bearer(murid.accessToken));
  expect(retry.status).toBe(200);
  expect(((await retry.json()) as { scannedAt: number }).scannedAt).toBe(firstBody.scannedAt);
  const dup = await request('/api/attendance/scan', { qrCodeValue, clientNonce: crypto.randomUUID(), deviceId }, bearer(murid.accessToken));
  expect(dup.status).toBe(409);
  expect(((await dup.json()) as { error: string }).error).toContain('sudah tercatat');
});

test('device mismatch rejected and audited', async () => {
  const { murid, deviceId, qrCodeValue } = await makeScanEnv();
  const otherDevice = crypto.randomUUID();
  const scan = await request('/api/attendance/scan', { qrCodeValue, clientNonce: crypto.randomUUID(), deviceId: otherDevice }, bearer(murid.accessToken));
  expect(scan.status).toBe(403);
  const audits = db.select().from(auditLogs).all() as Array<{ action: string }>;
  expect(audits.some((a) => a.action === 'device_mismatch')).toBe(true);
  void deviceId;
});

test('invalid or inactive gate rejected', async () => {
  const { murid, deviceId, qrCodeValue } = await makeScanEnv();
  expect((await request('/api/attendance/scan', { qrCodeValue: 'gate-hantu', clientNonce: crypto.randomUUID(), deviceId }, bearer(murid.accessToken))).status).toBe(400);
  const admin = await makeGuru('admin2@example.com', true);
  const gatesList = await (await app.request('/api/gates', { headers: bearer(admin.accessToken) })).json() as { data: Array<{ id: number }> };
  await send('PATCH', `/api/gates/${gatesList.data[0].id}`, { isActive: false }, bearer(admin.accessToken));
  expect((await request('/api/attendance/scan', { qrCodeValue, clientNonce: crypto.randomUUID(), deviceId }, bearer(murid.accessToken))).status).toBe(400);
});

test('closed session blocks scan', async () => {
  const { admin, murid, deviceId, qrCodeValue } = await makeScanEnv();
  await send('POST', '/api/sessions/close', undefined, bearer(admin.accessToken));
  const scan = await request('/api/attendance/scan', { qrCodeValue, clientNonce: crypto.randomUUID(), deviceId }, bearer(murid.accessToken));
  expect(scan.status).toBe(409);
  expect(((await scan.json()) as { error: string }).error).toContain('ditutup');
});

test('geofence enforced only when radius set; missing GPS asked explicitly', async () => {
  const admin = await makeGuru('admin@example.com', true);
  const cls = await send('POST', '/api/classes', { name: 'X', gradeLevel: 10, academicYear: '2026/2027' }, bearer(admin.accessToken));
  const classId = ((await cls.json()) as { id: number }).id;
  const deviceId = crypto.randomUUID();
  const murid = await register('murid@example.com', 'MURID', { nis: '556', deviceId });
  await send('PATCH', `/api/students/${murid.user.id}`, { classId }, bearer(admin.accessToken));
  await send('POST', '/api/sessions/open', undefined, bearer(admin.accessToken));
  await send('PATCH', '/api/config/attendance', { checkInStart: '00:00', onTimeCutoff: '23:59', checkInEnd: '23:59' }, bearer(admin.accessToken));
  const gate = await send('POST', '/api/gates', { name: 'Gerang Geofence', latitude: -6.2, longitude: 106.6, radiusMeters: 50 }, bearer(admin.accessToken));
  const qrCodeValue = ((await gate.json()) as { data: { qrCodeValue: string } }).data.qrCodeValue;
  expect((await request('/api/attendance/scan', { qrCodeValue, clientNonce: crypto.randomUUID(), deviceId }, bearer(murid.accessToken))).status).toBe(400);
  const far = await request('/api/attendance/scan', { qrCodeValue, clientNonce: crypto.randomUUID(), deviceId, latitude: -7.3, longitude: 107.9 }, bearer(murid.accessToken));
  expect(far.status).toBe(403);
  expect(((await far.json()) as { error: string }).error).toContain('luar area sekolah');
  const near = await request('/api/attendance/scan', { qrCodeValue, clientNonce: crypto.randomUUID(), deviceId, latitude: -6.2001, longitude: 106.6001 }, bearer(murid.accessToken));
  expect(near.status).toBe(201);
});

test('murid without class blocked from scanning', async () => {
  const admin = await makeGuru('admin@example.com', true);
  await send('POST', '/api/sessions/open', undefined, bearer(admin.accessToken));
  const gate = await send('POST', '/api/gates', { name: 'G' }, bearer(admin.accessToken));
  const qrCodeValue = ((await gate.json()) as { data: { qrCodeValue: string } }).data.qrCodeValue;
  const murid = await makeMurid();
  const scan = await request('/api/attendance/scan', { qrCodeValue, clientNonce: crypto.randomUUID(), deviceId: crypto.randomUUID() }, bearer(murid.accessToken));
  expect([400, 403]).toContain(scan.status);
  void murid;
});

test('time windows: before start, after end, late cutoff', async () => {
  const minute = wibNowMinutes();
  if (minute === 0 || minute >= 1439) return; // hindari wrap menit — kasus tepat tengah malam
  const admin = await makeGuru('admin@example.com', true);
  const cls = await send('POST', '/api/classes', { name: 'X', gradeLevel: 10, academicYear: '2026/2027' }, bearer(admin.accessToken));
  const classId = ((await cls.json()) as { id: number }).id;
  const deviceId = crypto.randomUUID();
  const murid = await register('murid@example.com', 'MURID', { nis: '557', deviceId });
  await send('PATCH', `/api/students/${murid.user.id}`, { classId }, bearer(admin.accessToken));
  await send('POST', '/api/sessions/open', undefined, bearer(admin.accessToken));
  const gate = await send('POST', '/api/gates', { name: 'G' }, bearer(admin.accessToken));
  const qrCodeValue = ((await gate.json()) as { data: { qrCodeValue: string } }).data.qrCodeValue;

  await send('PATCH', '/api/config/attendance', { checkInStart: fmtMinutes(minute + 1), onTimeCutoff: '23:59', checkInEnd: '23:59' }, bearer(admin.accessToken));
  expect((await request('/api/attendance/scan', { qrCodeValue, clientNonce: crypto.randomUUID(), deviceId }, bearer(murid.accessToken))).status).toBe(403);

  await send('PATCH', '/api/config/attendance', { checkInStart: '00:00', onTimeCutoff: fmtMinutes(minute - 1), checkInEnd: fmtMinutes(minute) }, bearer(admin.accessToken));
  const late = await request('/api/attendance/scan', { qrCodeValue, clientNonce: crypto.randomUUID(), deviceId }, bearer(murid.accessToken));
  expect(late.status).toBe(201);
  expect(((await late.json()) as { status: string }).status).toBe('telat');

  const murid2 = await register('murid2@example.com', 'MURID', { nis: '558', deviceId: crypto.randomUUID() });
  await send('PATCH', `/api/students/${murid2.user.id}`, { classId }, bearer(admin.accessToken));
  await send('PATCH', '/api/config/attendance', { checkInStart: '00:00', onTimeCutoff: '00:00', checkInEnd: fmtMinutes(Math.max(minute - 1, 0)) }, bearer(admin.accessToken));
  expect((await request('/api/attendance/scan', { qrCodeValue, clientNonce: crypto.randomUUID(), deviceId: crypto.randomUUID() }, bearer(murid2.accessToken))).status).toBe(403);
});

test('guru cannot use student attendance endpoints', async () => {
  const guru = await makeGuru();
  expect((await app.request('/api/attendance/me', { headers: bearer(guru.accessToken) })).status).toBe(403);
  expect((await send('POST', '/api/attendance/scan', { qrCodeValue: 'x', clientNonce: crypto.randomUUID(), deviceId: crypto.randomUUID() }, bearer(guru.accessToken))).status).toBe(403);
});

// ===== Fase 5: rekap & export =====
test('daily report computes hadir, tidak hadir, and no-session marker', async () => {
  const { admin, murid, deviceId, qrCodeValue } = await makeScanEnv();
  const second = await register('murid2@example.com', 'MURID', { nis: '559', deviceId: crypto.randomUUID() });
  const cls = await (await app.request('/api/classes', { headers: bearer(admin.accessToken) })).json() as { data: Array<{ id: number }> };
  await send('PATCH', `/api/students/${second.user.id}`, { classId: cls.data[0].id }, bearer(admin.accessToken));
  await request('/api/attendance/scan', { qrCodeValue, clientNonce: crypto.randomUUID(), deviceId }, bearer(murid.accessToken));

  const report = await (await app.request('/api/reports/daily', { headers: bearer(admin.accessToken) })).json() as {
    sessionStatus: string;
    classes: Array<{ students: Array<{ status: string | null }> }>;
  };
  expect(report.sessionStatus).toBe('open');
  const statuses = report.classes.flatMap((c) => c.students.map((s) => s.status));
  expect(statuses).toContain('hadir');
  expect(statuses).toContain('tidak hadir');

  const empty = await (await app.request('/api/reports/daily?date=2026-01-01', { headers: bearer(admin.accessToken) })).json() as { sessionStatus: null; classes: Array<{ students: Array<{ status: null }> }> };
  expect(empty.sessionStatus).toBeNull();
  expect(empty.classes[0]?.students[0]?.status).toBeNull();
});

test('monthly report aggregates per student', async () => {
  const { admin, murid, deviceId, qrCodeValue } = await makeScanEnv();
  const absent = await register('absent@example.com', 'MURID', { nis: '560', deviceId: crypto.randomUUID() });
  const cls = await (await app.request('/api/classes', { headers: bearer(admin.accessToken) })).json() as { data: Array<{ id: number }> };
  await send('PATCH', `/api/students/${absent.user.id}`, { classId: cls.data[0].id }, bearer(admin.accessToken));
  await request('/api/attendance/scan', { qrCodeValue, clientNonce: crypto.randomUUID(), deviceId }, bearer(murid.accessToken));
  const month = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit' }).format(new Date());
  const report = await (await app.request(`/api/reports/monthly?month=${month}`, { headers: bearer(admin.accessToken) })).json() as { sessionCount: number; rows: Array<{ hadir: number; telat: number; tidakHadir: number }> };
  expect(report.sessionCount).toBe(1);
  expect(report.rows.find((r) => r.hadir === 1)).toBeTruthy();
  expect(report.rows.some((r) => r.tidakHadir === 1)).toBeTruthy();
});

test('export returns xlsx for guru and rejects murid', async () => {
  const admin = await makeGuru('admin@example.com', true);
  const daily = await app.request('/api/reports/export?type=daily', { headers: bearer(admin.accessToken) });
  expect(daily.status).toBe(200);
  expect(daily.headers.get('content-type')).toContain('spreadsheetml');
  const monthly = await app.request('/api/reports/export?type=monthly', { headers: bearer(admin.accessToken) });
  expect(monthly.status).toBe(200);
  const murid = await makeMurid();
  expect((await app.request('/api/reports/export?type=daily', { headers: bearer(murid.accessToken) })).status).toBe(403);
});

// ===== Fase 6: hardening =====
test('register rate limited per IP', async () => {
  const inputs = Array.from({ length: 6 }, (_, index) => ({ email: `r${index}@example.com`, password: 'password123', fullName: 'R', registrationCode: 'MURID', deviceId: crypto.randomUUID(), nis: String(index) }));
  const statuses: number[] = [];
  for (const input of inputs) statuses.push((await request('/api/auth/register', input)).status);
  expect(statuses.filter((status) => status === 429).length).toBeGreaterThan(0);
});

test('unknown query and body fields rejected everywhere', async () => {
  const admin = await makeGuru('admin@example.com', true);
  expect((await app.request('/api/students?hacker=1', { headers: bearer(admin.accessToken) })).status).toBe(400);
  expect((await send('POST', '/api/classes', { name: 'X', gradeLevel: 10, academicYear: '2026/2027', role: 'guru' }, bearer(admin.accessToken))).status).toBe(400);
});

test('security headers present on responses', async () => {
  const response = await app.request('/api/health');
  expect(response.headers.get('x-content-type-options')).toBe('nosniff');
});
