import { Stack } from 'expo-router';

// Stack list murid + detail — di dalam tab "Murid".
export default function GuruMuridLayout() {
  return (
    <Stack screenOptions={{ headerTintColor: '#0B6E4F', headerTitleStyle: { fontWeight: '600' } }}>
      <Stack.Screen name="index" options={{ title: 'Kelola Murid' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detail Murid' }} />
    </Stack>
  );
}
