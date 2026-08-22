import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { colors, radius, spacing } from '@/constants/theme';
import { sessionsApi, type AttendanceSession } from '@/api/sessions.api';
import { useAuthStore } from '@/store/auth-store';

// Dashboard guru Fase 3 — kontrol sesi. Rekap & kelola murid via tautan.
export default function GuruDashboard() {
  const { session: auth, logout } = useAuthStore();
  const user = auth?.user;
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSession((await sessionsApi.today()).data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat sesi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async () => {
    setPending(true);
    try {
      setSession(session?.status === 'open' ? await sessionsApi.close() : await sessionsApi.open());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengubah sesi');
    } finally {
      setPending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.greeting}>Halo, {user?.fullName}</Text>
        <Text style={styles.meta}>{user?.isAdmin ? 'Guru Admin' : 'Guru'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Sesi Absensi Hari Ini</Text>
        {loading ? (
          <ActivityIndicator color={colors.primary700} />
        ) : session?.status === 'open' ? (
          <>
            <View style={[styles.statusBadge, styles.open]}>
              <Text style={styles.statusOpen}>Dibuka</Text>
            </View>
            <Button label="Tutup Sesi" onPress={() => void toggle()} pending={pending} variant="danger-outline" />
          </>
        ) : (
          <>
            <View style={[styles.statusBadge, styles.closedBadge]}>
              <Text style={styles.statusClosed}>{session ? 'Ditutup' : 'Belum dibuka'}</Text>
            </View>
            <Button label="Buka Sesi" onPress={() => void toggle()} pending={pending} />
          </>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <Button label="Rekap Absensi" onPress={() => router.push('/(guru)/rekap')} />
      <Button label="Kelola Murid" onPress={() => router.push('/(guru)/murid')} />
      <Button label="Kelola Kelas" onPress={() => router.push('/(guru)/kelas')} />
      {user?.isAdmin ? <Button label="Kelola Gerbang" onPress={() => router.push('/(guru)/gerbang')} /> : null}
      <Button label="Keluar" onPress={() => void logout()} variant="danger-outline" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.backgroundAlt, flex: 1, gap: spacing.md, padding: spacing.lg },
  card: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  greeting: { color: colors.textPrimary, fontSize: 20, fontWeight: '700' },
  meta: { color: colors.textSecondary, fontSize: 14 },
  sectionTitle: { color: colors.primary700, fontSize: 15, fontWeight: '600' },
  statusBadge: { alignSelf: 'flex-start', borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  open: { backgroundColor: colors.primary100 },
  closedBadge: { backgroundColor: '#F3F4F6' },
  statusOpen: { color: colors.primary700, fontWeight: '600' },
  statusClosed: { color: colors.textSecondary, fontWeight: '600' },
  error: { color: colors.danger, fontSize: 13 },
});
