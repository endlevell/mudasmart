import { db } from '../db';
import { hashPassword, hashToken, id, newToken, signAccessToken, verifyPassword, type Role } from '../lib/auth';
import { repository, type User } from './repository';

const now = () => Date.now();
const fail = (status: number, message: string) => Object.assign(new Error(message), { status });
type DeviceInput = { deviceId: string; platform?: string; model?: string; userAgent: string };
type Register = DeviceInput & { email: string; password: string; fullName: string; registrationCode: string; nis?: string; nip?: string };
type Login = DeviceInput & { email: string; password: string };
const refreshExpiry = () => now() + 30 * 86_400_000;
const output = async (user: User, refreshToken: string) => ({ user, accessToken: await signAccessToken(user), refreshToken });
const issue = (userId: string, deviceId: number, refreshToken: string, familyId = id()) => repository.insertRefresh.run({ id: id(), userId, deviceId, tokenHash: hashToken(refreshToken), familyId, expiresAt: refreshExpiry(), now: now() });
const deviceFor = (user: User, input: DeviceInput, ip: string) => {
  const current = repository.deviceByUser.all({ userId: user.id })[0];
  // deviceId NULL berarti belum/sudah di-reset — murid boleh bind ulang.
  if (user.role === 'murid' && current && current.deviceId !== null && current.deviceId !== input.deviceId) throw fail(403, 'Perangkat tidak diizinkan');
  const existing = repository.deviceById.get({ deviceId: input.deviceId });
  if (existing && existing.userId !== user.id) throw fail(403, 'Perangkat tidak diizinkan');
  if (current && current.userAgent !== input.userAgent) repository.log(user.id, 'user_agent_mismatch', ip, { deviceId: input.deviceId });
  if (current) { repository.touchDevice.run({ id: current.id, deviceId: input.deviceId, platform: input.platform ?? null, model: input.model ?? null, userAgent: input.userAgent, now: now() }); return current.id; }
  return repository.insertDevice.get({ userId: user.id, deviceId: input.deviceId, platform: input.platform ?? null, model: input.model ?? null, userAgent: input.userAgent, now: now() })!.id;
};
export const authService = {
  async register(input: Register, ip: string) {
    const passwordHash = await hashPassword(input.password); const refreshToken = newToken();
    const user = db.transaction(() => {
      const code = repository.code.get({ code: input.registrationCode, now: now() });
      if (!code) throw fail(400, 'Kode registrasi tidak valid');
      if (code.roleAllowed === 'murid' && !input.nis) throw fail(400, 'NIS wajib untuk murid');
      if (repository.userByEmail.get({ email: input.email })) throw fail(409, 'Email sudah digunakan');
      const user: User = { id: id(), email: input.email, fullName: input.fullName, role: code.roleAllowed as Role, isActive: true, isAdmin: false };
      const time = now(); repository.insertUser.run({ ...user, passwordHash, now: time });
      if (user.role === 'murid') repository.insertStudent.run({ userId: user.id, nis: input.nis!, now: time }); else repository.insertTeacher.run({ userId: user.id, nip: input.nip ?? null, now: time });
      // Semua alur berjalan dalam transaksi sinkron single-proses; cek state sebelum update sudah menjamin keunikan.
      repository.useCode.run({ code: input.registrationCode, now: time });
      const deviceId = deviceFor(user, input, ip); issue(user.id, deviceId, refreshToken); repository.log(user.id, 'register', ip, { deviceId: input.deviceId, userAgent: input.userAgent }); return user;
    });
    return output(user, refreshToken);
  },
  async login(input: Login, ip: string) {
    const found = repository.userByEmail.get({ email: input.email });
    if (!found || !found.isActive || !(await verifyPassword(found.passwordHash, input.password))) { repository.log(found?.id ?? null, 'login_failed', ip); throw fail(401, 'Email atau kata sandi salah'); }
    const user: User = found; const refreshToken = newToken();
    db.transaction(() => { const deviceId = deviceFor(user, input, ip); issue(user.id, deviceId, refreshToken); repository.log(user.id, 'login', ip, { deviceId: input.deviceId, userAgent: input.userAgent }); });
    return output(user, refreshToken);
  },
  async refresh(input: DeviceInput & { refreshToken: string }, ip: string) {
    const stored = repository.refreshByHash.get({ tokenHash: hashToken(input.refreshToken) });
    if (!stored) throw fail(401, 'Refresh token tidak valid');
    // Reuse: revoke seluruh family HARUS persist sebelum menolak — jangan gabung dengan throw di transaksi yang sama (rollback membatalkan revocation).
    if (stored.revokedAt) {
      db.transaction(() => { repository.revokeFamily.run({ familyId: stored.familyId, now: now() }); repository.log(stored.userId, 'refresh_reuse', ip); });
      throw fail(401, 'Refresh token tidak valid');
    }
    const user = repository.activeUserById.get({ id: stored.userId });
    if (!user) {
      db.transaction(() => repository.revokeToken.run({ tokenHash: hashToken(input.refreshToken), now: now() }));
      throw fail(401, 'Refresh token tidak valid');
    }
    const device = repository.deviceById.get({ deviceId: input.deviceId });
    if (!device || device.id !== stored.deviceId || device.userId !== user.id || stored.expiresAt <= now()) {
      db.transaction(() => repository.revokeToken.run({ tokenHash: hashToken(input.refreshToken), now: now() }));
      throw fail(401, 'Refresh token tidak valid');
    }
    const refreshToken = newToken();
    db.transaction(() => {
      repository.revokeToken.run({ tokenHash: hashToken(input.refreshToken), now: now() });
      repository.touchDeviceAgent.run({ id: device.id, userAgent: input.userAgent, now: now() });
      issue(user.id, stored.deviceId, refreshToken, stored.familyId);
      repository.log(user.id, 'refresh', ip, { deviceId: input.deviceId, userAgent: input.userAgent });
    });
    return output(user, refreshToken);
  },
  logout(userId: string, refreshToken: string, ip: string) {
    db.transaction(() => { const token = repository.refreshByHash.get({ tokenHash: hashToken(refreshToken) }); if (token?.userId === userId && !token.revokedAt) { repository.revokeToken.run({ tokenHash: hashToken(refreshToken), now: now() }); repository.log(userId, 'logout', ip); } });
  },
};
