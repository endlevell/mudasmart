import { api } from './client';

export interface Gate {
  id: number;
  name: string;
  qrCodeValue: string;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number | null;
  isActive: boolean;
}

export const gatesApi = {
  list: () => api.get<{ data: Gate[] }>('/api/gates'),
  create: (input: { name: string; latitude?: number; longitude?: number; radiusMeters?: number }) =>
    api.post<{ data: Gate }>('/api/gates', input, true),
  update: (id: number, input: { name?: string; latitude?: number | null; longitude?: number | null; radiusMeters?: number | null; isActive?: boolean; regenerateQr?: boolean }) =>
    api.patch<{ data: Gate }>(`/api/gates/${id}`, input),
};
