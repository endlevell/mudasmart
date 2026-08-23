import { api } from './client';
import { getOrCreateDeviceId } from '@/utils/secure-storage';

export interface ScanResult {
  status: 'hadir' | 'telat';
  scannedAt: number;
  message: string;
}

export interface HistoryItem {
  id: number;
  scannedAt: number;
  status: 'hadir' | 'telat';
  gateName: string;
}

export const attendanceApi = {
  scan: async (qrCodeValue: string, clientNonce: string, coords?: { latitude: number; longitude: number }) => {
    const deviceId = await getOrCreateDeviceId();
    return api.post<ScanResult>('/api/attendance/scan', { qrCodeValue, clientNonce, deviceId, ...coords }, true);
  },
  history: (month?: string) =>
    api.get<{ data: HistoryItem[]; total: number; page: number; pageSize: number; sessionDates: string[] }>(
      `/api/attendance/me${month ? `?month=${month}` : ''}`,
      true,
    ),
  today: () => api.get<{ data: { status: 'hadir' | 'telat'; scannedAt: number } | null }>('/api/attendance/me/today', true),
  // Guru/admin membatalkan absensi murid — record dihapus agar murid bisa scan ulang.
  cancelRecord: (recordId: number) => api.del<null>(`/api/attendance/records/${recordId}`, true),
};
