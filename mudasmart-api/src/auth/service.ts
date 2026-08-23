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
  // Murid terkunci ke satu device aktif; deviceId NULL berarti belum/di-reset → boleh bind ulang.
  // Guru bebas login dari device mana pun. Satu device boleh dipakai beberapa akun.
  if (user.role === 'murid' && current && current.deviceId !== null && current.deviceId !== input.deviceId) throw fail(403, 'Perangkat tidak diizinkan');
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
    // Jangan pernah bawa passwordHash keluar dari service.
    const { passwordHash: _hash, ...user } = found; const refreshToken = newToken();
    db.transaction(() => { const deviceId = deviceFor(user, input, ip); issue(user.id, deviceId, refreshToken); repository.log(user.id, 'login', ip, { deviceId: input.deviceId, userAgent: input.userAgent }); });
    return output(user, refreshToken);
  },
  // Ganti kata sandi sendiri — verifikasi sandi lama, lalu cabut semua sesi refresh
  // agar perangkat lain harus login ulang.
  async changePassword(userId: string, ip: string, input: { currentPassword: string; newPassword: string }) {
    const found = repository.userWithHashById.get({ id: userId });
    if (!found || !(await verifyPassword(found.passwordHash, input.currentPassword))) throw fail(400, 'Kata sandi saat ini salah');
    const passwordHash = await hashPassword(input.newPassword);
    db.transaction(() => {
      repository.updatePassword.run({ id: userId, passwordHash, now: now() });
      repository.revokeAllForUser.run({ userId, now: now() });
      repository.log(userId, 'password_changed', ip);
    });
  },
  // Admin mereset kata sandi user mana pun (kecuali dirinya) → menghasilkan sandi sementara
  // yang ditampilkan sekali; semua sesi target dicabut.
  async adminResetPassword(actorId: string, ip: string, targetId: string) {
    if (targetId === actorId) throw fail(400, 'Gunakan ganti kata sandi untuk akun sendiri');
    const target = repository.userById.get({ id: targetId });
    if (!target) throw fail(404, 'User tidak ditemukan');
    const temporaryPassword = `Muda-${newToken().slice(0, 8)}`;
    const passwordHash = await hashPassword(temporaryPassword);
    db.transaction(() => {
      repository.updatePassword.run({ id: targetId, passwordHash, now: now() });
      repository.revokeAllForUser.run({ userId: targetId, now: now() });
      repository.log(actorId, 'password_reset_by_admin', ip, { targetId });
    });
    return { temporaryPassword };
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
    // Token refresh terikat ke baris device milik user ini (deviceId string kini bisa dipakai bersama antar akun).
    const device = repository.deviceByUser.all({ userId: user.id })[0];
    if (!device || device.id !== stored.deviceId || device.deviceId !== input.deviceId || stored.expiresAt <= now()) {
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
