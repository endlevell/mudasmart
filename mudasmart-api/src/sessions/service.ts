import { eq } from 'drizzle-orm';
import { repository as authRepository } from '../auth/repository';
import { db } from '../db';
import { attendanceSessions } from '../db/schema';
import { fail } from '../lib/http';
import { todayWib } from '../lib/time';

const now = () => Date.now();

export const sessionsRepository = {
  byDate(date: string) {
    return db.select().from(attendanceSessions).where(eq(attendanceSessions.date, date)).get();
  },
  create(input: { date: string; openedBy: string; openedAt: number }, createdAt: number) {
    return db.insert(attendanceSessions).values({ ...input, status: 'open', createdAt }).returning({ id: attendanceSessions.id }).get();
  },
  reopen(id: number, openedBy: string, at: number) {
    db.update(attendanceSessions).set({ status: 'open', openedBy, openedAt: at, closedBy: null, closedAt: null }).where(eq(attendanceSessions.id, id)).run();
  },
  close(id: number, closedBy: string, at: number) {
    db.update(attendanceSessions).set({ status: 'closed', closedBy, closedAt: at }).where(eq(attendanceSessions.id, id)).run();
  },
};

export const sessionsService = {
  open(actorId: string, ip: string) {
    const date = todayWib();
    const existing = sessionsRepository.byDate(date);
    if (!existing) {
      const created = sessionsRepository.create({ date, openedBy: actorId, openedAt: now() }, now());
      authRepository.log(actorId, 'session_opened', ip, { sessionId: created!.id, date });
      return this.byDate(date)!;
    }
    if (existing.status === 'closed') {
      // Edge case 14: buka ulang hari yang sama — update baris yang sama, bukan insert baru.
      sessionsRepository.reopen(existing.id, actorId, now());
      authRepository.log(actorId, 'session_opened', ip, { sessionId: existing.id, date, reopened: true });
      return this.byDate(date)!;
    }
    return existing;
  },

  close(actorId: string, ip: string) {
    const existing = sessionsRepository.byDate(todayWib());
    if (!existing) throw fail(404, 'Belum ada sesi hari ini');
    if (existing.status === 'open') {
      sessionsRepository.close(existing.id, actorId, now());
      authRepository.log(actorId, 'session_closed', ip, { sessionId: existing.id });
    }
    return this.byDate(todayWib())!;
  },

  today() {
    return sessionsRepository.byDate(todayWib()) ?? null;
  },

  byDate(date: string) {
    const session = sessionsRepository.byDate(date);
    if (!session) throw fail(404, 'Sesi tidak ditemukan');
    return session;
  },
};
