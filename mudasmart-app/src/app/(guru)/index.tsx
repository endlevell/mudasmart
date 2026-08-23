import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { colors, spacing, type } from '../../constants/theme';
import { sessionsApi, type AttendanceSession } from '../../api/sessions.api';
import { useAuthStore } from '../../store/auth-store';

// Dashboard guru — kontrol sesi + pintasan modul.
export default function GuruDashboard() {
  const { session: auth, logout } = useAuthStore();
  const user = auth?.user;
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
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
    void loadSession();
    // Polling ringan agar kartu sesi tetap sinkron.
    const interval = setInterval(() => void loadSession(), 15_000);
    return () => clearInterval(interval);
  }, [loadSession]);

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
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Halo,</Text>
          <Text style={styles.name}>{user?.fullName}</Text>
        </View>
        <Badge label={user?.isAdmin ? 'Guru Admin' : 'Guru'} tone="info" />
      </View>

      <Card style={styles.sessionCard}>
        <Text style={styles.sectionLabel}>Sesi Absensi Hari Ini</Text>
        {loading ? (
          <Text style={styles.sessionState}>Memuat...</Text>
        ) : (
          <>
            <Text style={[styles.sessionState, session?.status !== 'open' && styles.sessionClosed]}>
              {session?.status === 'open' ? 'Sedang Dibuka' : session ? 'Ditutup' : 'Belum dibuka'}
            </Text>
            <Button
              label={session?.status === 'open' ? 'Tutup Sesi' : 'Buka Sesi'}
              onPress={() => void toggle()}
              pending={pending}
              variant={session?.status === 'open' ? 'danger-outline' : 'primary'}
            />
          </>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Card>

      <Card>
        <PressableRow label="Rekap Absensi" sub="Harian, bulanan, export Excel" onPress={() => router.push('/(guru)/rekap')} />
        <Divider />
        <PressableRow label="Kelola Murid" sub="Data murid & reset perangkat" onPress={() => router.push('/(guru)/murid')} />
        <Divider />
        <PressableRow label="Kelola Kelas" sub="Daftar kelas & wali kelas" onPress={() => router.push('/(guru)/kelas')} />
        {user?.isAdmin ? (
          <>
            <Divider />
            <PressableRow label="Kelola Gerbang" sub="QR gerbang & geofence" onPress={() => router.push('/(guru)/gerbang')} />
          </>
        ) : null}
      </Card>

      <Button label="Keluar" onPress={() => void logout()} variant="ghost" />
    </View>
  );
}

function PressableRow({ label, sub, onPress }: { label: string; sub: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.rowPress}>
      <View>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const Divider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  container: { backgroundColor: colors.backgroundAlt, flex: 1, gap: spacing.md, padding: spacing.lg },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  greeting: { ...type.body, color: colors.textSecondary },
  name: { ...type.title, color: colors.primary900 },
  sessionCard: { gap: spacing.sm },
  sectionLabel: { ...type.label, color: colors.textSecondary, textTransform: 'uppercase' },
  sessionState: { ...type.title, color: colors.primary700 },
  sessionClosed: { color: colors.textSecondary },
  error: { color: colors.danger, fontSize: type.caption.fontSize },
  rowPress: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  rowLabel: { ...type.bodyStrong, color: colors.textPrimary },
  rowSub: { ...type.caption, color: colors.textSecondary },
  divider: { backgroundColor: colors.border, height: 1 },
  chevron: { color: colors.primary500, fontSize: 26, fontWeight: '700' },
});
