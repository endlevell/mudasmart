import * as SecureStore from 'expo-secure-store';

const KEYS = {
  accessToken: 'mudas.accessToken',
  refreshToken: 'mudas.refreshToken',
  user: 'mudas.user',
  deviceId: 'mudas.deviceId',
  onboardingSeen: 'mudas.onboardingSeen',
} as const;

// Cache in-memory agar gate di root layout tidak menunggu I/O berulang.
let cachedOnboardingSeen: boolean | null = null;

export const isOnboardingSeen = async (): Promise<boolean> => {
  if (cachedOnboardingSeen !== null) return cachedOnboardingSeen;
  cachedOnboardingSeen = (await SecureStore.getItemAsync(KEYS.onboardingSeen)) === '1';
  return cachedOnboardingSeen;
};

export const markOnboardingSeen = async () => {
  cachedOnboardingSeen = true;
  await SecureStore.setItemAsync(KEYS.onboardingSeen, '1');
};

// Token hanya boleh lewat sini (Keychain/Keystore) — jangan AsyncStorage.
export const saveSession = async (session: { accessToken: string; refreshToken: string; user: unknown }) => {
  await SecureStore.setItemAsync(KEYS.accessToken, session.accessToken);
  await SecureStore.setItemAsync(KEYS.refreshToken, session.refreshToken);
  await SecureStore.setItemAsync(KEYS.user, JSON.stringify(session.user));
};

export const loadSession = async () => {
  const [accessToken, refreshToken, user] = await Promise.all([
    SecureStore.getItemAsync(KEYS.accessToken),
    SecureStore.getItemAsync(KEYS.refreshToken),
    SecureStore.getItemAsync(KEYS.user),
  ]);
  if (!accessToken || !refreshToken || !user) return null;
  try {
    return { accessToken, refreshToken, user: JSON.parse(user) };
  } catch {
    return null;
  }
};

export const clearSession = async () => {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.accessToken),
    SecureStore.deleteItemAsync(KEYS.refreshToken),
    SecureStore.deleteItemAsync(KEYS.user),
  ]);
};

export const getOrCreateDeviceId = async () => {
  const existing = await SecureStore.getItemAsync(KEYS.deviceId);
  if (existing) return existing;
  const { randomUUID } = await import('expo-crypto');
  const deviceId = randomUUID();
  await SecureStore.setItemAsync(KEYS.deviceId, deviceId);
  return deviceId;
};
