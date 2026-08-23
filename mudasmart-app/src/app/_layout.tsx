import { SplashScreen, Stack, useSegments, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { onboardingSeenSync, primeOnboardingFlag } from '@/utils/secure-storage';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { session, hydrated, hydrate } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  // Flag onboarding dibaca sinkron dari cache; state ini cuma menandai cache sudah di-prime.
  const [flagPrimed, setFlagPrimed] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    void (async () => {
      await primeOnboardingFlag();
      setFlagPrimed(true);
    })();
  }, []);

  useEffect(() => {
    if (!hydrated || !flagPrimed) return;
    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    if (!session) {
      if (!onboardingSeenSync() && !inOnboarding) {
        router.replace('/onboarding');
      } else if (!inAuth && !inOnboarding) {
        router.replace('/(auth)/login');
      }
    } else if (inAuth || inOnboarding) {
      router.replace(session.user.role === 'murid' ? '/(murid)' : '/(guru)');
    }
    SplashScreen.hideAsync().catch(() => {});
  }, [hydrated, flagPrimed, session, segments, router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
