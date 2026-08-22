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
    api.post<AuthResponse>('/api/auth/register', { ...input, platform: platform(), model: 'unknown' }),
  login: (input: LoginInput) =>
    api.post<AuthResponse>('/api/auth/login', { ...input, platform: platform(), model: 'unknown' }),
  logout: (refreshToken: string) => api.post<void>('/api/auth/logout', { refreshToken }, true),
  me: () => api.get<{ user: User }>('/api/auth/me'),
};
