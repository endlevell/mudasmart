import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { colors, radius, spacing } from '@/constants/theme';
import { sessionsApi } from '@/api/sessions.api';
import { useAuthStore } from '@/store/auth-store';

// Dashboard murid — status sesi hari ini. Scan absen dibangun di Fase 4.
export default function MuridDashboard() {
  const { session: auth, logout } = useAuthStore();
  const user = auth?.user;
  const [sessionStatus, setSessionStatus] = useState<string>('Memuat...');
  const [configInfo] = useState<string>('');

  const loadSession = useCallback(async () => {
    try {
      const result = (await sessionsApi.today()).data;
      setSessionStatus(result?.status === 'open' ? 'Sesi absen: Dibuka' : result ? 'Sesi absen: Ditutup' : 'Sesi absen: Belum dibuka');
    } catch {
      setSessionStatus('Gagal memuat status sesi');
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.greeting}>Halo, {user?.fullName}</Text>
        <Text style={styles.meta}>NIS {user?.email}</Text>
        <Text style={styles.badge}>Murid</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.session}>{sessionStatus}</Text>
        {configInfo ? <Text style={styles.meta}>{configInfo}</Text> : null}
      </View>
      <Button label="Keluar" onPress={() => void logout()} variant="danger-outline" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundAlt,
    flex: 1,
    gap: spacing.lg,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  greeting: { color: colors.textPrimary, fontSize: 20, fontWeight: '700' },
  session: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  meta: { color: colors.textSecondary, fontSize: 14 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary100,
    borderRadius: radius.md,
    color: colors.primary700,
    fontSize: 12,
    fontWeight: '600',
    marginTop: spacing.sm,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
