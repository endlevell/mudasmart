import { repository as authRepository } from '../auth/repository';
import { configService } from '../config/service';
import { gatesRepository } from '../gates/repository';
import { haversineMeters } from '../lib/geofence';
import { fail } from '../lib/http';
import { hhmmToMinutes, todayWib, wibMinutes } from '../lib/time';
import { sessionsRepository } from '../sessions/service';
import { attendanceRepository } from './repository';
import { leavesRepository } from '../leaves/repository';

const now = () => Date.now();
const WIB_TZ = 'Asia/Jakarta';
const wibTimeLabel = (ms: number) => new Intl.DateTimeFormat('en-GB', { timeZone: WIB_TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ms));

type ScanInput = {
  qrCodeValue: string;
  clientNonce: string;
  deviceId: string;
  latitude?: number;
  longitude?: number;
};

const toBody = (record: { status: string; scannedAt: number }, created: boolean) => ({
  body: {
    status: record.status,
    scannedAt: record.scannedAt,
    message: record.status === 'hadir' ? 'Absensi berhasil dicatat' : 'Absensi tercatat sebagai telat',
  },
  created,
});

export const attendanceService = {
  // Urutan validasi persis Bagian 8 — jangan disederhanakan atau diubah urutannya.
  scan(user: { id: string }, input: ScanInput, ip: string, userAgent: string, opts: { nowMinutes?: number } = {}) {
    // 2. Device binding.
    const device = authRepository.deviceByUser.all({ userId: user.id })[0];
    if (!device || device.deviceId === null) throw fail(403, 'Perangkat belum terdaftar, silakan login ulang');
    if (device.deviceId !== input.deviceId) {
      authRepository.log(user.id, 'device_mismatch', ip, { deviceId: input.deviceId });
      throw fail(403, 'Perangkat tidak dikenali, hubungi guru untuk reset perangkat');
    }
    if (device.userAgent !== userAgent) authRepository.log(user.id, 'user_agent_mismatch', ip, { deviceId: input.deviceId });

    // 3. Gate aktif.
    const gate = gatesRepository.byQrValue(input.qrCodeValue);
    if (!gate || !gate.isActive) throw fail(400, 'QR tidak valid');

    // 4. Sesi hari ini (WIB).
    const session = sessionsRepository.byDate(todayWib());
    if (!session) throw fail(409, 'Sesi absensi belum dibuka');
    if (session.status === 'closed') throw fail(409, 'Sesi absensi sudah ditutup');

    // 5. Kelas wajib terisi (edge case 12).
    const classId = attendanceRepository.classIdOf(user.id);
    if (!classId) throw fail(403, 'Kelas Anda belum diatur, hubungi wali kelas');

    // 6. Window waktu dari jam server (WIB).
    const minutes = opts.nowMinutes ?? wibMinutes();
    const config = configService.get();
    const start = hhmmToMinutes(config.checkInStart);
    const cutoff = hhmmToMinutes(config.onTimeCutoff);
    const end = hhmmToMinutes(config.checkInEnd);
    if (minutes < start) throw fail(403, 'Belum waktunya absen');
    if (minutes > end) throw fail(403, 'Waktu absen sudah berakhir, hubungi guru piket');
    const status = minutes <= cutoff ? 'hadir' : 'telat';

    // 7. Geofence bila aktif pada gerbang ini.
    let geofencePassed: boolean | null = null;
    if (gate.radiusMeters != null) {
      if (input.latitude === undefined || input.longitude === undefined) throw fail(400, 'Aktifkan GPS untuk melakukan absensi');
      const distance = haversineMeters(input.latitude, input.longitude, gate.latitude!, gate.longitude!);
      if (distance > gate.radiusMeters) {
        authRepository.log(user.id, 'geofence_failed', ip, { gateId: gate.id, distance: Math.round(distance) });
        throw fail(403, 'Anda berada di luar area sekolah');
      }
      geofencePassed = true;
    }

    // 8. Idempotensi retry (nonce sama) dan duplikat (nonce beda).
    const replay = attendanceRepository.recordByNonce(session.id, input.clientNonce);
    if (replay) return toBody(replay, false);
    const duplicate = attendanceRepository.recordByStudent(session.id, user.id);
    if (duplicate) throw fail(409, `Anda sudah tercatat ${duplicate.status} pukul ${wibTimeLabel(duplicate.scannedAt)}`);

    // 9. Simpan dengan snapshot kelas.
    const scannedAt = now();
    attendanceRepository.insert({
      sessionId: session.id,
      studentId: user.id,
      classIdSnapshot: classId,
      gateId: gate.id,
      deviceId: device.id,
      scannedAt,
      status,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      geofencePassed,
      clientNonce: input.clientNonce,
    });
    return toBody({ status, scannedAt }, true);
  },

  async history(studentId: string, query: { month?: string; page: number; pageSize: number }) {
    const range = query.month
      ? (() => {
          const [year, month] = query.month.split('-').map(Number);
          return { startMs: Date.UTC(year, month - 1, 1) - 7 * 3_600_000, endMs: Date.UTC(year, month, 1) - 7 * 3_600_000 };
        })()
      : null;
    const result = await attendanceRepository.history(studentId, {
      startMs: range?.startMs ?? 0,
      endMs: range?.endMs ?? Number.MAX_SAFE_INTEGER,
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
    });
    // Izin disetujui dalam bulan tsb — dipakai client menandai hari izin & mengurangi alfa.
    const leaves = query.month
      ? leavesRepository
          .approvedBetween(range!.startMs, range!.endMs)
          .filter((leave) => leave.studentId === studentId)
          .map((leave) => ({ date: leave.date, type: leave.type }))
      : [];
    return {
      ...result,
      page: query.page,
      pageSize: query.pageSize,
      sessionDates: query.month ? attendanceRepository.sessionDates(query.month) : [],
      leaves,
    };
  },

  todayRecord(studentId: string) {
    return attendanceRepository.todayRecord(studentId, todayWib()) ?? null;
  },

  // Guru/admin membatalkan absensi: record dihapus sehingga murid bisa scan ulang
  // (UNIQUE(session_id, student_id) kembali bebas). Selalu diaudit.
  cancelRecord(actorId: string, ip: string, recordId: number) {
    const record = attendanceRepository.byId(recordId);
    if (!record) throw fail(404, 'Catatan absensi tidak ditemukan');
    attendanceRepository.deleteById(recordId);
    authRepository.log(actorId, 'attendance_cancelled', ip, {
      recordId,
      studentId: record.studentId,
      sessionId: record.sessionId,
      status: record.status,
    });
  },
};
