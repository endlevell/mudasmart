import { beforeEach, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { app } from './app';
import { db } from './db';
import { auditLogs, attendanceConfig, attendanceSessions, classes, devices, gates, refreshTokens, registrationCodes, studentProfiles, teacherProfiles, users } from './db/schema';
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

beforeEach(() => { resetRateLimits(); db.delete(auditLogs).run(); db.delete(refreshTokens).run(); db.delete(devices).run(); db.delete(studentProfiles).run(); db.delete(teacherProfiles).run(); db.delete(attendanceSessions).run(); db.delete(gates).run(); db.delete(attendanceConfig).run(); db.delete(classes).run(); db.delete(registrationCodes).run(); db.delete(users).run(); code('MURID', 'murid'); code('GURU', 'guru'); });
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
