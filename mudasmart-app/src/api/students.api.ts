import { api } from './client';

export interface Student {
  id: string;
  email: string;
  fullName: string;
  nis: string;
  classId: number | null;
  className: string | null;
}

export interface DeviceInfo {
  id: number;
  deviceId: string | null;
  platform: string | null;
  model: string | null;
  userAgent: string;
  resetCount: number;
  lastSeenAt: number;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  classId?: number;
}

const toQuery = (params: ListParams) => {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.pageSize) search.set('pageSize', String(params.pageSize));
  if (params.q) search.set('q', params.q);
  if (params.classId) search.set('classId', String(params.classId));
  const query = search.toString();
  return query ? `?${query}` : '';
};

export const studentsApi = {
  list: (params: ListParams = {}) => api.get<{ data: Student[]; total: number; page: number; pageSize: number }>(`/api/students${toQuery(params)}`),
  detail: (id: string) => api.get<{ data: Student }>(`/api/students/${id}`),
  update: (id: string, input: { fullName?: string; classId?: number }) => api.patch<{ data: Student }>(`/api/students/${id}`, input),
  deactivate: (id: string) => api.patch<null>(`/api/students/${id}/deactivate`, {}),
  device: (id: string) => api.get<{ data: DeviceInfo }>(`/api/students/${id}/device`),
  resetDevice: (id: string) => api.patch<null>(`/api/students/${id}/device/reset`, {}),
};
