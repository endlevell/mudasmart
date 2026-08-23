import { getOrCreateDeviceId, getStoredCredentials } from '@/utils/secure-storage';
import type { AuthResponse } from './types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// Dipakai modul yang butuh URL penuh (mis. unduhan file dengan header auth).
export const apiBaseUrl = () => BASE_URL;

interface Tokens {
  accessToken?: string | null;
  refreshToken?: string | null;
}

// Lapisan token tercepat — hasil rotasi refresh SELALU ditulis di sini dulu,
// lalu disinkronkan ke store (zustand + SecureStore) lewat onTokensRotated.
let memoryTokens: Tokens | null = null;

export const getClientTokens = (): Tokens => memoryTokens ?? {};
export const setClientTokens = (tokens: Tokens) => {
  memoryTokens = { ...(memoryTokens ?? {}), ...tokens };
};
export const clearClientTokens = () => {
  memoryTokens = null;
};

let getTokens: () => Tokens = () => ({});
let onTokensRotated: (data: AuthResponse) => void = () => {};
let onSessionExpired: () => void = () => {};

// Dipasang oleh auth-store agar client tidak mengimpor store (hindari siklus impor).
export const configureClient = (handlers: {
  getTokens: () => Tokens;
  onTokensRotated: (data: AuthResponse) => void;
  onSessionExpired: () => void;
}) => {
  getTokens = handlers.getTokens;
  onTokensRotated = handlers.onTokensRotated;
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
  const isFormData = init.body instanceof FormData;
  if (init.body && !isFormData && !headers.has('content-type')) headers.set('content-type', 'application/json');
  const tokens = getTokens();
  if (auth && tokens.accessToken) headers.set('authorization', `Bearer ${tokens.accessToken}`);

  const body = isFormData ? init.body : typeof init.body === 'string' || init.body === undefined ? init.body : JSON.stringify(init.body);
  const response = await fetch(`${BASE_URL}${path}`, { ...init, body, headers });

  // Refresh sekali pada 401 untuk endpoint berauth; endpoint auth tidak di-retry.
  if (response.status === 401 && auth && !retried && !path.startsWith('/api/auth/')) {
    let recovered = await tryRefresh(tokens.refreshToken ?? null);
    // Refresh gagal (token dicabut/di-reset) → login ulang diam-diam memakai
    // kredensial tersimpan. Pengguna tidak pernah disodori halaman login.
    if (!recovered) recovered = await tryRelogin();
    if (recovered) return request<T>(path, init, auth, true);
    console.warn('[auth] refresh & relogin gagal, sesi diakhiri:', path);
    onSessionExpired();
  }
  if (response.ok) reloginAttempted = false;

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof data === 'object' && data !== null && 'error' in data ? String((data as { error: unknown }).error) : 'Terjadi kesalahan';
    throw new ApiError(response.status, message);
  }
  return data as T;
}

// Single-flight refresh: banyak request bisa 401 bersamaan; SEMUA menunggu satu
// proses refresh yang sama. Tanpa ini, refresh paralel memicu deteksi reuse di
// server → seluruh family dicabut → user dipaksa logout tiap buka ulang app.
let refreshInFlight: Promise<boolean> | null = null;
// Auto-relogin hanya dicoba sekali per "kegagalan sesi"; flag reset saat ada
// request yang sukses (tanda sesi sehat kembali).
let reloginAttempted = false;

async function tryRefresh(refreshToken: string | null): Promise<boolean> {
  if (!refreshToken) return false;
  if (!refreshInFlight) {
    refreshInFlight = doRefresh(refreshToken).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function tryRelogin(): Promise<boolean> {
  if (reloginAttempted) return false;
  reloginAttempted = true;
  try {
    const credentials = await getStoredCredentials();
    if (!credentials) return false;
    const deviceId = await getOrCreateDeviceId();
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...credentials, deviceId, platform: String(process.env.EXPO_OS ?? 'android'), model: 'unknown' }),
    });
    if (!response.ok) return false;
    const data = (await response.json()) as AuthResponse;
    adoptTokens(data);
    return true;
  } catch {
    return false;
  }
}

async function doRefresh(refreshToken: string): Promise<boolean> {
  try {
    const deviceId = await getOrCreateDeviceId();
    const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken, deviceId }),
    });
    if (!response.ok) return false;
    const data = (await response.json()) as AuthResponse;
    adoptTokens(data);
    return true;
  } catch {
    return false;
  }
}

// Token hasil rotasi dipakai seketika + diteruskan ke store untuk dipersist
// ke SecureStore. INI YANG DULU HILANG: token baru cuma di memori, sehingga
// setelah keluar app sesi selalu mati.
function adoptTokens(data: AuthResponse) {
  setClientTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  onTokensRotated(data);
}

// Default auth=true — hampir semua endpoint wajib token. Endpoint publik (register/login/refresh)
// secara eksplisit memakai auth=false.
export const api = {
  get: <T>(path: string, auth = true) => request<T>(path, { method: 'GET' }, auth, false),
  post: <T>(path: string, body: unknown, auth = true) =>
    request<T>(path, { method: 'POST', body: typeof body === 'string' || body instanceof FormData ? body : JSON.stringify(body) }, auth, false),
  patch: <T>(path: string, body: unknown, auth = true) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, auth, false),
  del: <T>(path: string, auth = true) => request<T>(path, { method: 'DELETE' }, auth, false),
};
