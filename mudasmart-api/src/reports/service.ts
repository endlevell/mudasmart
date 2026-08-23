import { todayWib } from '../lib/time';
import { reportsRepository } from './repository';

type StudentRow = { id: string; fullName: string; nis: string; classId: number | null; className: string | null };

const wibDateOf = (ms: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(ms));

export const reportsService = {
  daily(query: { date?: string; classId?: number }) {
    const date = query.date ?? todayWib();
    const session = reportsRepository.sessionByDate(date);
    const records = session ? reportsRepository.recordsForSession(session.id) : [];
    const byStudent = new Map(records.map((record) => [record.studentId, record]));
    // Izin disetujui pada tanggal tsb — berlaku hanya bila murid tidak scan.
    const onLeave = new Set(reportsRepository.approvedLeavesOn(date).map((leave) => leave.studentId));

    const grouped = new Map<number | null, { classId: number | null; className: string; students: Array<Record<string, unknown>> }>();
    for (const student of reportsRepository.activeStudents(query.classId) as StudentRow[]) {
      const key = student.classId;
      if (!grouped.has(key)) grouped.set(key, { classId: student.classId, className: student.className ?? 'Tanpa Kelas', students: [] });
      const record = byStudent.get(student.id);
      grouped.get(key)!.students.push({
        id: student.id,
        nis: student.nis,
        fullName: student.fullName,
        // Hari tanpa sesi: null (bukan alfa); hari bersesi tanpa record: Tidak Hadir,
        // kecuali ada izin disetujui → Izin. Record scan tetap menang atas izin.
        status: record ? record.status : session ? (onLeave.has(student.id) ? 'izin' : 'tidak hadir') : null,
        scannedAt: record?.scannedAt ?? null,
        // Id record untuk aksi guru (mis. batalkan absensi); null saat belum scan.
        recordId: record?.id ?? null,
      });
    }
    return { date, sessionStatus: session?.status ?? null, classes: [...grouped.values()] };
  },

  monthly(query: { month?: string; classId?: number }) {
    const month = query.month ?? todayWib().slice(0, 7);
    const range = ((): { startMs: number; endMs: number } => {
      const [year, m] = month.split('-').map(Number);
      return { startMs: Date.UTC(year, m - 1, 1) - 7 * 3_600_000, endMs: Date.UTC(year, m, 1) - 7 * 3_600_000 };
    })();
    const sessionDates = reportsRepository.sessionDates(month);
    const records = reportsRepository.recordsInRange(range.startMs, range.endMs);
    const approvedLeaves = reportsRepository.approvedLeavesInRange(range.startMs, range.endMs);
    const leaveDaysByStudent = new Map<string, Set<string>>();
    for (const leave of approvedLeaves) {
      const set = leaveDaysByStudent.get(leave.studentId) ?? new Set<string>();
      set.add(leave.date);
      leaveDaysByStudent.set(leave.studentId, set);
    }

    const perStudent = new Map<string, { hadir: number; telat: number; days: Set<string> }>();
    for (const record of records) {
      const entry = perStudent.get(record.studentId) ?? { hadir: 0, telat: 0, days: new Set<string>() };
      if (record.status === 'hadir') entry.hadir += 1;
      else entry.telat += 1;
      entry.days.add(wibDateOf(record.scannedAt));
      perStudent.set(record.studentId, entry);
    }

    const rows = (reportsRepository.activeStudents(query.classId) as StudentRow[]).map((student) => {
      const entry = perStudent.get(student.id);
      const days = entry?.days ?? new Set<string>();
      const leaveDays = leaveDaysByStudent.get(student.id) ?? new Set<string>();
      // Hari bersesi tanpa record dibagi: ada izin disetujui → Izin, selainnya Alfa.
      let izin = 0;
      let tidakHadir = 0;
      for (const date of sessionDates) {
        if (days.has(date)) continue;
        if (leaveDays.has(date)) izin += 1;
        else tidakHadir += 1;
      }
      return {
        studentId: student.id,
        nis: student.nis,
        fullName: student.fullName,
        className: student.className ?? 'Tanpa Kelas',
        hadir: entry?.hadir ?? 0,
        telat: entry?.telat ?? 0,
        izin,
        tidakHadir,
      };
    });
    return { month, sessionCount: sessionDates.length, rows };
  },
};
