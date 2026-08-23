import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { authApi } from '../api/auth.api';

// Handler tampilan notifikasi saat app terbuka (foreground).
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/** Minta izin, ambil Expo push token, dan daftarkan ke server (murid). */
export async function registerForPush(): Promise<void> {
  try {
    // Remote push sudah tidak ada di Expo Go (SDK 53+) — hanya build asli.
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;

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
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: 'Absensi', importance: Notifications.AndroidImportance.DEFAULT });
  }
};
