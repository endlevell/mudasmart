import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { colors, spacing, type } from '../../constants/theme';
import { attendanceApi } from '../../api/attendance.api';
import { sessionsApi } from '../../api/sessions.api';
import { useAuthStore } from '../../store/auth-store';

// Dashboard murid — status sesi & absen hari ini. Scan aktif hanya saat sesi terbuka (edge case 5).
export default function MuridDashboard() {
  const { session: auth, logout } = useAuthStore();
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
    // Polling ringan: status sesi/absen ter-update otomatis tanpa logout-login.
    const interval = setInterval(() => void load(), 15_000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Halo,</Text>
          <Text style={styles.name}>{user?.fullName}</Text>
        </View>
        <Badge label="Murid" tone="success" />
      </View>

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
          <Text style={styles.hint}>Belum absen hari ini</Text>
        )}
        <Button disabled={!sessionOpen || !!todayStatus} label="Scan Absen" onPress={() => router.push('/(murid)/scan')} />
      </Card>

      <View style={styles.links}>
        <Card style={styles.linkCard}>
          <PressableRow label="Riwayat Absensi" sub="Rekap per bulan" onPress={() => router.push('/(murid)/riwayat')} />
        </Card>
      </View>

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

const styles = StyleSheet.create({
  container: { backgroundColor: colors.backgroundAlt, flex: 1, gap: spacing.md, padding: spacing.lg },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  greeting: { ...type.body, color: colors.textSecondary },
  name: { ...type.title, color: colors.primary900 },
  sessionCard: { gap: spacing.sm },
  sectionLabel: { ...type.label, color: colors.textSecondary, textTransform: 'uppercase' },
  sessionState: { ...type.title, color: colors.primary700 },
  sessionClosed: { color: colors.textSecondary },
  hint: { ...type.caption, color: colors.textSecondary },
  todayRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  todayTime: { ...type.caption, color: colors.textSecondary },
  links: { gap: spacing.sm },
  linkCard: { paddingVertical: spacing.xs },
  rowPress: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xs, paddingVertical: spacing.sm },
  rowLabel: { ...type.bodyStrong, color: colors.textPrimary },
  rowSub: { ...type.caption, color: colors.textSecondary },
  chevron: { color: colors.primary500, fontSize: 26, fontWeight: '700' },
});
