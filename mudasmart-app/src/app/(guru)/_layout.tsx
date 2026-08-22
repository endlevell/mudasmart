import { Stack } from 'expo-router';
import { colors } from '../../constants/theme';

export default function GuruLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary700,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
