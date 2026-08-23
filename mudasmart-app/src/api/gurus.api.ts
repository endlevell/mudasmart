import { api } from './client';

export interface GuruRow {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  isAdmin: boolean;
}

export const gurusApi = {
  list: () => api.get<{ data: GuruRow[] }>('/api/gurus'),
  setAdmin: (id: string, isAdmin: boolean) => api.patch<{ data: GuruRow }>(`/api/gurus/${id}/admin`, { isAdmin }),
  deactivate: (id: string) => api.patch<null>(`/api/gurus/${id}/deactivate`, {}),
};
