import { desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { attendanceConfig } from '../db/schema';

export const configRepository = {
  latest() {
    return db.select().from(attendanceConfig).orderBy(desc(attendanceConfig.id)).limit(1).get();
  },
  create(input: { checkInStart: string; onTimeCutoff: string; checkInEnd: string; updatedBy?: string | null }, now: number) {
    return db.insert(attendanceConfig).values({ ...input, updatedBy: input.updatedBy ?? null, updatedAt: now }).returning({ id: attendanceConfig.id }).get();
  },
  update(id: number, input: Record<string, unknown>, now: number) {
    db.update(attendanceConfig).set({ ...input, updatedAt: now }).where(eq(attendanceConfig.id, id)).run();
  },
};
