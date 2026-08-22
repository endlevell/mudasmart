import { desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { gates } from '../db/schema';

export const gatesRepository = {
  list() {
    return db.select().from(gates).orderBy(desc(gates.createdAt)).all();
  },
  byId(id: number) {
    return db.select().from(gates).where(eq(gates.id, id)).get();
  },
  byQrValue(qrCodeValue: string) {
    return db.select().from(gates).where(eq(gates.qrCodeValue, qrCodeValue)).get();
  },
  create(input: { name: string; qrCodeValue: string; latitude?: number | null; longitude?: number | null; radiusMeters?: number | null }, now: number) {
    return db.insert(gates).values({ ...input, latitude: input.latitude ?? null, longitude: input.longitude ?? null, radiusMeters: input.radiusMeters ?? null, createdAt: now, updatedAt: now }).returning({ id: gates.id }).get();
  },
  update(id: number, values: Record<string, unknown>, now: number) {
    db.update(gates).set({ ...values, updatedAt: now }).where(eq(gates.id, id)).run();
  },
};
