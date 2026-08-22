import { api } from './client';

export interface AttendanceSession {
  id: number;
  date: string;
  openedBy: string;
  openedAt: number;
  closedBy: string | null;
  closedAt: number | null;
  status: 'open' | 'closed';
}

export interface AttendanceConfig {
  checkInStart: string;
  onTimeCutoff: string;
  checkInEnd: string;
}

export const sessionsApi = {
  today: () => api.get<{ data: AttendanceSession | null }>('/api/sessions/today'),
  open: () => api.post<AttendanceSession>('/api/sessions/open', {}, true),
  close: () => api.post<AttendanceSession>('/api/sessions/close', {}, true),
};

export const configApi = {
  getAttendance: () => api.get<{ data: AttendanceConfig }>('/api/config/attendance'),
};
