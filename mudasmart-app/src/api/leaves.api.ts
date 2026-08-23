import { api } from './client';

export type LeaveType = 'sakit' | 'izin';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: number;
  studentId: string;
  date: string;
  type: LeaveType;
  reason: string;
  imagePath: string | null;
  status: LeaveStatus;
  createdAt: number;
}

export interface LeaveListItem extends LeaveRequest {
  fullName: string;
  nis: string | null;
  className: string | null;
}

export const leavesApi = {
  /** Murid: ajukan untuk diri sendiri. body FormData (date, type, reason, image?). */
  create: (body: FormData) => api.post<{ id: number; status: LeaveStatus }>('/api/leave-requests', body),
  mine: () => api.get<{ data: LeaveRequest[] }>('/api/leave-requests/me'),
  list: (status?: LeaveStatus) => api.get<{ data: LeaveListItem[] }>(`/api/leave-requests${status ? `?status=${status}` : ''}`),
  review: (id: number, status: 'approved' | 'rejected') => api.patch<{ id: number; status: string }>(`/api/leave-requests/${id}/review`, { status }),
  imageUrl: (id: number) => `/api/leave-requests/${id}/image`,
};
