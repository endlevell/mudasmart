import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { colors, radius, spacing, type } from '../../constants/theme';
import { attendanceApi } from '../../api/attendance.api';
import { sessionsApi } from '../../api/sessions.api';
import { useAuthStore } from '../../store/auth-store';

// Beranda murid — status sesi live (polling 15s) + CTA scan.
export default function MuridDashboard() {
  const { session: auth } = useAuthStore();
  const user = auth?.user;
  const [sessionOpen, setSessionOpen] = useState<boolean | null>(null);
  const [todayStatus, setTodayStatus] = useState<{ status: string; time: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const session = (await sessionsApi.today()).data;
      setSessionOpen(session?.status === 'open');
    } catch {
      setSessionOpen(null);
    }
    try {
      const record = (await attendanceApi.today()).data;
      setTodayStatus(
        record
          ? {
              status: record.status === 'hadir' ? 'Hadir' : 'Telat',
              time: `${new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(record.scannedAt))} WIB`,
            }
          : null,
      );
    } catch {
      setTodayStatus(null);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 15_000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#073D2C', '#0B6E4F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.greeting}>Halo,</Text>
            <Text style={styles.name}>{user?.fullName}</Text>
          </View>
          <Badge label="Murid" tone="success" />
        </View>
      </LinearGradient>

      <Card style={styles.sessionCard}>
        <Text style={styles.sectionLabel}>Sesi Absensi</Text>
        <Text style={[styles.sessionState, sessionOpen === false && styles.sessionClosed]}>
          {sessionOpen === null ? 'Memuat...' : sessionOpen ? 'Sedang Dibuka' : 'Belum dibuka / ditutup'}
        </Text>
        {todayStatus ? (
          <View style={styles.todayRow}>
            <Badge label={`Sudah absen · ${todayStatus.status}`} tone={todayStatus.status === 'Hadir' ? 'success' : 'warning'} />
            <Text style={styles.todayTime}>{todayStatus.time}</Text>
          </View>
        ) : (
          <Text style={styles.hint}>{sessionOpen ? 'Tekan tombol Scan di bawah untuk absen' : 'Tunggu guru piket membuka sesi'}</Text>
        )}
        <Button disabled={!sessionOpen || !!todayStatus} label="Scan Absen" onPress={() => void load()} />
      </Card>

      <Text style={styles.footnote}>Gunakan tab Scan di navigasi bawah untuk membuka kamera.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.backgroundAlt, flex: 1 },
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
  hint: { ...type.caption, color: colors.textSecondary },
  todayRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  todayTime: { ...type.caption, color: colors.textSecondary },
  footnote: { ...type.caption, color: colors.textSecondary, textAlign: 'center' },
});
