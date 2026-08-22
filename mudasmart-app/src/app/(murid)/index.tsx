import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { colors, radius, spacing } from '@/constants/theme';
import { attendanceApi } from '@/api/attendance.api';
import { sessionsApi } from '@/api/sessions.api';
import { useAuthStore } from '@/store/auth-store';

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
      setTodayStatus(record ? { status: record.status === 'hadir' ? 'Hadir' : 'Telat', time: `${new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(record.scannedAt))} WIB` } : null);
    } catch {
      setTodayStatus(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.greeting}>Halo, {user?.fullName}</Text>
        <Text style={styles.badge}>Murid</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Sesi Absensi</Text>
        <Text style={[styles.sessionText, sessionOpen === false && styles.sessionClosed]}>
          {sessionOpen === null ? 'Memuat...' : sessionOpen ? 'Dibuka' : 'Belum dibuka / ditutup'}
        </Text>
        {todayStatus ? (
          <Text style={[styles.todayBadge, { color: todayStatus.status === 'Hadir' ? colors.primary700 : colors.warning }]}>
            Anda sudah absen: {todayStatus.status} pukul {todayStatus.time}
          </Text>
        ) : null}
        <Button
          disabled={!sessionOpen || !!todayStatus}
          label="Scan Absen"
          onPress={() => router.push('/(murid)/scan')}
        />
      </View>

      <Button label="Riwayat Absensi" onPress={() => router.push('/(murid)/riwayat')} />
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
  sectionTitle: { color: colors.primary700, fontSize: 15, fontWeight: '600' },
  sessionText: { color: colors.primary700, fontSize: 18, fontWeight: '700' },
  sessionClosed: { color: colors.textSecondary },
  todayBadge: { fontSize: 14, fontWeight: '600' },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary100,
    borderRadius: radius.md,
    color: colors.primary700,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
