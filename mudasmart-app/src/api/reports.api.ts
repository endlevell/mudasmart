// SDK 55 memecah API baru/legacy — downloadAsync dengan header masih di jalur legacy.
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { api, apiBaseUrl } from './client';

export interface DailyReport {
  date: string;
  sessionStatus: 'open' | 'closed' | null;
  classes: {
    classId: number | null;
    className: string;
    students: { id: string; nis: string; fullName: string; status: 'hadir' | 'telat' | 'tidak hadir' | null; scannedAt: number | null; recordId: number | null }[];
  }[];
}

export interface MonthlyReport {
  month: string;
  sessionCount: number;
  rows: { studentId: string; nis: string; fullName: string; className: string; hadir: number; telat: number; tidakHadir: number }[];
}

const query = (params: { date?: string; month?: string; classId?: number }) => {
  const search = new URLSearchParams();
  if (params.date) search.set('date', params.date);
  if (params.month) search.set('month', params.month);
  if (params.classId) search.set('classId', String(params.classId));
  const qs = search.toString();
  return qs ? `?${qs}` : '';
};

export const reportsApi = {
  daily: (params: { date?: string; classId?: number }) => api.get<DailyReport>(`/api/reports/daily${query(params)}`, true),
  monthly: (params: { month?: string; classId?: number }) => api.get<MonthlyReport>(`/api/reports/monthly${query(params)}`, true),

  // Unduh dengan header Bearer lalu buka lewat share sheet.
  download: async (type: 'daily' | 'monthly', accessToken: string, params: { date?: string; month?: string; classId?: number }) => {
    const target = `${FileSystem.cacheDirectory}rekap-${type}.xlsx`;
    const result = await FileSystem.downloadAsync(`${apiBaseUrl()}/api/reports/export?type=${type}${query(params)}`, target, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (result.status !== 200) throw new Error('Gagal mengunduh rekap');
    if (!(await Sharing.isAvailableAsync())) throw new Error('Perangkat tidak mendukung berbagi file');
    await Sharing.shareAsync(result.uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: `Rekap ${type}`,
    });
  },
};
