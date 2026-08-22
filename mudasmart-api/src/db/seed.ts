import { randomBytes } from 'node:crypto';
import { count, eq } from 'drizzle-orm';
import { db, sqlite } from './index';
import './migrate';
import { gates, registrationCodes, teacherProfiles, users } from './schema';
import { hashPassword, id } from '../lib/auth';

// Seed awal go-live: 1 admin, 1 kode registrasi guru, 1 gerbang. Aman dijalankan berulang.
const now = Date.now();
const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@mudasmart.local';

const existingAdmin = db.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
if (!existingAdmin) {
  const password = randomBytes(9).toString('base64url');
  const userId = id();
  db.insert(users).values({ id: userId, email, passwordHash: await hashPassword(password), fullName: 'Admin Sekolah', role: 'guru', isActive: true, createdAt: now, updatedAt: now }).run();
  db.insert(teacherProfiles).values({ userId, isAdmin: true, createdAt: now, updatedAt: now }).run();
  console.log(`[seed] Admin dibuat: ${email} / ${password}`);
  console.log('[seed] WAJIB catat password di atas — tidak ditampilkan lagi.');
} else {
  console.log(`[seed] Admin sudah ada: ${email} (lewati)`);
}

const activeCode = db.select().from(registrationCodes).where(eq(registrationCodes.isActive, true)).get();
if (!activeCode) {
  const code = `GURU-${randomBytes(4).toString('hex').toUpperCase()}`;
  db.insert(registrationCodes).values({ code, roleAllowed: 'guru', isActive: true, maxUses: null, usedCount: 0, createdAt: now, updatedAt: now }).run();
  console.log(`[seed] Kode registrasi guru: ${code}`);
} else {
  console.log(`[seed] Kode registrasi aktif sudah ada: ${activeCode.code} (lewati)`);
}

const gateCount = db.select({ total: count() }).from(gates).get();
if (!gateCount || gateCount.total === 0) {
  const qr = `gate-${randomBytes(12).toString('base64url')}`;
  db.insert(gates).values({ name: 'Gerbang Utama', qrCodeValue: qr, createdAt: now, updatedAt: now }).run();
  console.log(`[seed] Gerbang dibuat: Gerbang Utama (QR: ${qr})`);
} else {
  console.log('[seed] Gerbang sudah ada (lewati)');
}

sqlite.close();
