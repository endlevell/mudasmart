import { SplashScreen, Stack, useSegments, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { isOnboardingSeen } from '@/utils/secure-storage';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { session, hydrated, hydrate } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  // null = belum dicek; false = first launch; true = sudah pernah buka app.
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    void (async () => setOnboarded(await isOnboardingSeen()))();
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || onboarded === null) return;
    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    if (!session) {
      if (!onboarded && !inOnboarding) {
        router.replace('/onboarding');
      } else if (!inAuth && !inOnboarding) {
        router.replace('/(auth)/login');
      }
    } else if (inAuth || inOnboarding) {
      router.replace(session.user.role === 'murid' ? '/(murid)' : '/(guru)');
    }
    SplashScreen.hideAsync().catch(() => {});
  }, [hydrated, onboarded, session, segments, router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
