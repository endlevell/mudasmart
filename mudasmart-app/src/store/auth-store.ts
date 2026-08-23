import { create } from 'zustand';
import { authApi, type LoginInput, type RegisterInput } from '@/api/auth.api';
import { clearClientTokens, configureClient, getClientTokens, setClientTokens } from '@/api/client';
import type { AuthResponse, User } from '@/api/types';
import { clearCredentials, clearSession, getOrCreateDeviceId, loadSession, saveCredentials, saveSession } from '@/utils/secure-storage';

interface Session {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  session: Session | null;
  hydrated: boolean;
  pending: boolean;
  error: string | null;
}

interface AuthActions {
  hydrate: () => Promise<void>;
  login: (input: Omit<LoginInput, 'deviceId'>) => Promise<void>;
  register: (input: Omit<RegisterInput, 'deviceId'>) => Promise<void>;
  logout: () => Promise<void>;
  expire: () => void;
}

const persist = async (data: AuthResponse) => {
  await saveSession(data);
  return { ...data } satisfies Session;
};

export const useAuthStore = create<AuthState & AuthActions>()((set, get) => {
  // Client tidak mengimpor store (hindari siklus impor); store yang memasang handler.
  const wire = () =>
    configureClient({
      getTokens: () => {
        const memory = getClientTokens();
        const state = get().session;
        return {
          accessToken: memory.accessToken ?? state?.accessToken,
          refreshToken: memory.refreshToken ?? state?.refreshToken,
        };
      },
      // Rotasi refresh token WAJIB dipersist ke SecureStore — kalau hanya di
      // memori, sesi mati setiap kali app ditutup (akar bug logout paksa).
      onTokensRotated: (data: AuthResponse) => {
        const state = get();
        if (!state.session) return;
        const next = { ...state.session, accessToken: data.accessToken, refreshToken: data.refreshToken };
        void saveSession(next);
        set({ session: next });
      },
      onSessionExpired: () => get().expire(),
    });

  const runAuth = async (
    action: (deviceId: string) => Promise<AuthResponse>,
    credentials?: { email: string; password: string },
  ) => {
    set({ pending: true, error: null });
    try {
      const deviceId = await getOrCreateDeviceId();
      const session = await persist(await action(deviceId));
      // Kredensial disimpan untuk auto-relogin — kunci sesi permanen.
      if (credentials) await saveCredentials(credentials.email, credentials.password);
      set({ session });
      wire();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Terjadi kesalahan' });
      throw error;
    } finally {
      set({ pending: false });
    }
  };

  return {
    session: null,
    hydrated: false,
    pending: false,
    error: null,

    hydrate: async () => {
      const stored = await loadSession();
      set({ session: stored as Session | null, hydrated: true });
      if (stored) {
        setClientTokens({ accessToken: stored.accessToken, refreshToken: stored.refreshToken });
        wire();
      }
    },

    login: (input) => runAuth((deviceId) => authApi.login({ ...input, deviceId }), { email: input.email, password: input.password }),
    register: (input) => runAuth((deviceId) => authApi.register({ ...input, deviceId }), { email: input.email, password: input.password }),

    logout: async () => {
      const { session } = get();
      if (session) {
        try {
          await authApi.logout(session.refreshToken);
        } catch {
          // Logout server gagal — tetap bersihkan sesi lokal.
        }
      }
      clearClientTokens();
      await clearSession();
      await clearCredentials();
      set({ session: null, error: null });
    },

    expire: () => {
      void clearSession();
      set({ session: null });
    },
  };
});
