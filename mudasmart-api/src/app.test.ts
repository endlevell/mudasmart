import { beforeEach, expect, test } from 'bun:test';
import { app } from './app';
import { db } from './db';
import { auditLogs, devices, refreshTokens, registrationCodes, studentProfiles, teacherProfiles, users } from './db/schema';

const request = (path: string, body: unknown, headers: Record<string, string> = {}) => app.request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const code = (code: string, roleAllowed: 'murid' | 'guru', maxUses = 2) => db.insert(registrationCodes).values({ code, roleAllowed, maxUses, usedCount: 0, isActive: true, createdAt: Date.now(), updatedAt: Date.now() }).run();

beforeEach(() => { db.delete(auditLogs).run(); db.delete(refreshTokens).run(); db.delete(devices).run(); db.delete(studentProfiles).run(); db.delete(teacherProfiles).run(); db.delete(registrationCodes).run(); db.delete(users).run(); code('MURID', 'murid'); code('GURU', 'guru'); });
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
