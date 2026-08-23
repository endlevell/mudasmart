import { create } from 'zustand';
import { authApi, type LoginInput, type RegisterInput } from '@/api/auth.api';
import { configureClient } from '@/api/client';
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
      getTokens: () => get().session ?? {},
      setTokens: (tokens) =>
        set((state) => {
          if (!state.session) return {};
          return {
            session: {
              ...state.session,
              accessToken: tokens.accessToken ?? state.session.accessToken,
              refreshToken: tokens.refreshToken ?? state.session.refreshToken,
            },
          };
        }),
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
      if (stored) wire();
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
