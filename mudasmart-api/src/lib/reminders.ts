import { attendanceRepository } from '../attendance/repository';
import { sessionsRepository } from '../sessions/service';
import { configService } from '../config/service';
import { hhmmToMinutes, todayWib, wibMinutes } from './time';
import { sendPush } from './push';

// Pengingat sekali per hari per sesi: menit ke-20 setelah jam mulai absen,
// murid aktif yang belum scan mendapat push "kamu belum absen".
const notifiedDates = new Set<string>();

export function startReminderScheduler() {
  setInterval(() => {
    try {
      const date = todayWib();
      const session = sessionsRepository.byDate(date);
      if (!session || session.status !== 'open') return;
      const minutes = wibMinutes();
      const start = hhmmToMinutes(configService.get().checkInStart);
      if (minutes !== start + 20 || notifiedDates.has(session.id.toString())) return;

      notifiedDates.add(session.id.toString());
      const targets = attendanceRepository
        .muridsWithoutRecord(session.id)
        .filter((row) => row.token)
        .map((row) => ({ to: row.token!, title: 'Belum absen hari ini', body: 'Sesi masih dibuka — scan QR gerbang sekarang.', data: { type: 'reminder' } }));
      void sendPush(targets);
    } catch {
      // scheduler tidak boleh menjatuhkan proses
    }
  }, 60_000);
}
