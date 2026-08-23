import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { LiquidButton } from '../../components/ui/liquid-button';
import { colors, radius, spacing, type } from '../../constants/theme';
import { sessionsApi, type AttendanceSession } from '../../api/sessions.api';
import { useAuthStore } from '../../store/auth-store';

// Beranda guru — kontrol sesi live (polling 15s). Modul lain via tab bawah.
export default function GuruDashboard() {
  const { session: auth } = useAuthStore();
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
      <LinearGradient colors={['#073D2C', '#0B6E4F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.greeting}>Halo,</Text>
            <Text style={styles.name}>{user?.fullName}</Text>
          </View>
          <Badge label={user?.isAdmin ? 'Guru Admin' : 'Guru'} tone="info" />
        </View>
      </LinearGradient>

      <Card style={styles.sessionCard}>
        <Text style={styles.sectionLabel}>Sesi Absensi Hari Ini</Text>
        {loading ? (
          <Text style={styles.sessionState}>Memuat...</Text>
        ) : (
          <>
            <Text style={[styles.sessionState, session?.status !== 'open' && styles.sessionClosed]}>
              {session?.status === 'open' ? 'Sedang Dibuka' : session ? 'Ditutup' : 'Belum dibuka'}
            </Text>
            <LiquidButton
              label={session?.status === 'open' ? 'Tutup Sesi' : 'Buka Sesi'}
              onPress={() => void toggle()}
              pending={pending}
            />
          </>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Card>

      <Text style={styles.footnote}>Rekap, data murid, dan pengaturan ada di navigasi bawah.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.backgroundAlt, flex: 1, paddingBottom: 140 },
  hero: {
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  heroRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  greeting: { ...type.body, color: 'rgba(255,255,255,0.75)' },
  name: { ...type.title, color: colors.textInverse },
  sessionCard: { gap: spacing.sm, margin: spacing.md },
  sectionLabel: { ...type.label, color: colors.textSecondary, textTransform: 'uppercase' },
  sessionState: { ...type.title, color: colors.primary700 },
  sessionClosed: { color: colors.textSecondary },
  error: { color: colors.danger, fontSize: type.caption.fontSize },
  footnote: { ...type.caption, color: colors.textSecondary, textAlign: 'center' },
});
