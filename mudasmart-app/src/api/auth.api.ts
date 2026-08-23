import { api } from './client';
import type { AuthResponse, User } from './types';

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  registrationCode: string;
  nis?: string;
  nip?: string;
  deviceId: string;
}

export interface LoginInput {
  email: string;
  password: string;
  deviceId: string;
}

const platform = () => String(process.env.EXPO_OS ?? 'android');

export const authApi = {
  register: (input: RegisterInput) =>
    api.post<AuthResponse>('/api/auth/register', { ...input, platform: platform(), model: 'unknown' }, false),
  login: (input: LoginInput) =>
    api.post<AuthResponse>('/api/auth/login', { ...input, platform: platform(), model: 'unknown' }, false),
  logout: (refreshToken: string) => api.post<void>('/api/auth/logout', { refreshToken }, true),
  me: () => api.get<{ user: User }>('/api/auth/me'),
  // Ganti kata sandi sendiri — sesi refresh lain dicabut server.
  changePassword: (body: { currentPassword: string; newPassword: string }) => api.patch<null>('/api/auth/password', body),
  // Admin reset kata sandi user → sandi sementara dikembalikan sekali.
  adminResetPassword: (userId: string) => api.patch<{ temporaryPassword: string }>(`/api/users/${userId}/password`, {}),
};
