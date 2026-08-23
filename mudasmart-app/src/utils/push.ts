import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { authApi } from '../api/auth.api';

// PENTING: expo-notifications TIDAK BOLEH di-import statis.
// Di Expo Go (SDK 53+) modul ini melempar error saat evaluasi, sehingga semua
// route yang meng-import-nya gagal dimuat ("missing default export"/unmatched).
// Gunakan lazy require + guard environment.
const isExpoGo = () => Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const notifications = () => require('expo-notifications') as typeof import('expo-notifications');

/** Pasang handler tampilan notifikasi (aman dipanggil berkali-kali). */
export function configureNotifications() {
  if (isExpoGo()) return;
  try {
    const Notifications = notifications();
    Notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
    });
  } catch {
    // lingkungan tidak mendukung — abaikan
  }
}

/** Minta izin, ambil Expo push token, dan daftarkan ke server (murid). */
export async function registerForPush(): Promise<void> {
  if (isExpoGo()) return;
  try {
    configureNotifications();
    const Notifications = notifications();

    const settings = await Notifications.getPermissionsAsync();
    let granted = settings.granted;
    if (!granted) {
      const request = await Notifications.requestPermissionsAsync();
      granted = request.granted;
    }
    if (!granted) return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return;
    await authApi.registerPushToken(token);
  } catch {
    // Push bersifat opsional — kegagalan tidak boleh mengganggu sesi.
  }
}

export const configureAndroidChannel = async () => {
  if (Platform.OS !== 'android' || isExpoGo()) return;
  try {
    const Notifications = notifications();
    await Notifications.setNotificationChannelAsync('default', { name: 'Absensi', importance: Notifications.AndroidImportance.DEFAULT });
  } catch {
    // abaikan
  }
};
