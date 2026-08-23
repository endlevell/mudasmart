import { api } from './client';

export interface RegistrationCode {
  code: string;
  roleAllowed: 'murid' | 'guru';
  isActive: boolean;
  maxUses: number | null;
  usedCount: number;
  expiresAt: number | null;
}

export const codesApi = {
  list: () => api.get<{ data: RegistrationCode[] }>('/api/registration-codes'),
  create: (input: { code: string; roleAllowed: 'murid' | 'guru'; maxUses?: number }) =>
    api.post<{ data: RegistrationCode }>('/api/registration-codes', input),
  setActive: (code: string, isActive: boolean) => api.patch<{ data: RegistrationCode }>(`/api/registration-codes/${code}`, { isActive }),
};
