import { getOrCreateDeviceId } from '@/utils/secure-storage';
import type { AuthResponse } from './types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// Dipakai modul yang butuh URL penuh (mis. unduhan file dengan header auth).
export const apiBaseUrl = () => BASE_URL;

interface Tokens {
  accessToken?: string | null;
  refreshToken?: string | null;
}

let getTokens: () => Tokens = () => ({});
let setTokens: (tokens: Tokens) => void = () => {};
let onSessionExpired: () => void = () => {};

// Dipasang oleh auth-store agar client tidak mengimpor store (hindari siklus impor).
export const configureClient = (handlers: {
  getTokens: () => Tokens;
  setTokens: (tokens: Tokens) => void;
  onSessionExpired: () => void;
}) => {
  getTokens = handlers.getTokens;
  setTokens = handlers.setTokens;
  onSessionExpired = handlers.onSessionExpired;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit, auth: boolean, retried: boolean): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  const tokens = getTokens();
  if (auth && tokens.accessToken) headers.set('authorization', `Bearer ${tokens.accessToken}`);

  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  // Refresh sekali pada 401 untuk endpoint berauth; endpoint auth tidak di-retry.
  if (response.status === 401 && auth && !retried && !path.startsWith('/api/auth/')) {
    const refreshed = await tryRefresh(tokens.refreshToken ?? null);
    if (refreshed) return request<T>(path, init, auth, true);
    onSessionExpired();
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof data === 'object' && data !== null && 'error' in data ? String((data as { error: unknown }).error) : 'Terjadi kesalahan';
    throw new ApiError(response.status, message);
  }
  return data as T;
}

async function tryRefresh(refreshToken: string | null): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const deviceId = await getOrCreateDeviceId();
    const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken, deviceId }),
    });
    if (!response.ok) return false;
    const data = (await response.json()) as AuthResponse;
    setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return true;
  } catch {
    return false;
  }
}

// Default auth=true — hampir semua endpoint wajib token. Endpoint publik (register/login/refresh)
// secara eksplisit memakai auth=false.
export const api = {
  get: <T>(path: string, auth = true) => request<T>(path, { method: 'GET' }, auth, false),
  post: <T>(path: string, body: unknown, auth = true) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }, auth, false),
  patch: <T>(path: string, body: unknown, auth = true) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, auth, false),
};
