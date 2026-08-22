import { SplashScreen, Stack, useSegments, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { session, hydrated, hydrate } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    const inAuth = segments[0] === '(auth)';
    if (!session && !inAuth) router.replace('/(auth)/login');
    else if (session && inAuth) {
      router.replace(session.user.role === 'murid' ? '/(murid)' : '/(guru)');
    }
    SplashScreen.hideAsync().catch(() => {});
  }, [hydrated, session, segments, router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
