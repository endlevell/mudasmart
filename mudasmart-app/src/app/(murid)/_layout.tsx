import { Stack } from 'expo-router';
import { colors } from '../../constants/theme';

export default function MuridLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary700,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="scan" options={{ headerShown: false }} />
      <Stack.Screen name="riwayat" options={{ title: 'Riwayat Absensi' }} />
    </Stack>
  );
}
