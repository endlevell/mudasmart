import { desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { registrationCodes } from '../db/schema';

export const codesRepository = {
  list() {
    return db.select().from(registrationCodes).orderBy(desc(registrationCodes.createdAt)).all();
  },
  byCode(code: string) {
    return db.select().from(registrationCodes).where(eq(registrationCodes.code, code)).get();
  },
  create(input: { code: string; roleAllowed: 'murid' | 'guru'; maxUses?: number | null; expiresAt?: string | null }, now: number) {
    db.insert(registrationCodes)
      .values({
        code: input.code,
        roleAllowed: input.roleAllowed,
        maxUses: input.maxUses ?? null,
        // Simpan expiry sebagai epoch ms (konsisten dengan pemakaian lain); akhir hari WIB.
        expiresAt: input.expiresAt ? Date.parse(`${input.expiresAt}T23:59:59+07:00`) : null,
        isActive: true,
        usedCount: 0,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  },
  update(code: string, values: Record<string, unknown>, now: number) {
    db.update(registrationCodes).set({ ...values, updatedAt: now }).where(eq(registrationCodes.code, code)).run();
  },
};
