import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Card } from '../../components/ui/card';
import { LiquidButton } from '../../components/ui/liquid-button';
import { PressableScale } from '../../components/ui/pressable-scale';
import { toast } from '../../components/ui/toast';
import { colors, gradients, radius, spacing, type } from '../../constants/theme';
import { sessionsApi, type AttendanceSession } from '../../api/sessions.api';
import { reportsApi, type DailyReport } from '../../api/reports.api';
import { useAuthStore } from '../../store/auth-store';

const jakarta = 'Asia/Jakarta';

const greeting = () => {
  const hour = Number(new Intl.DateTimeFormat('id-ID', { timeZone: jakarta, hour: '2-digit', hour12: false }).format(new Date()));
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 19) return 'Selamat sore';
  return 'Selamat malam';
};

const timeLabel = (ms: number) =>
  new Intl.DateTimeFormat('id-ID', { timeZone: jakarta, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ms));

interface Summary {
  hadir: number;
  telat: number;
  total: number;
  classes: { name: string; present: number; total: number }[];
}

// Beranda guru — kontrol sesi live (polling 15s) + ringkasan kehadiran hari ini.
export default function GuruDashboard() {
  const user = useAuthStore((state) => state.session?.user);
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
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

  const loadSummary = useCallback(async () => {
    try {
      const daily: DailyReport = await reportsApi.daily({});
      let hadir = 0;
      let telat = 0;
      let total = 0;
      const classes = daily.classes.map((cls) => {
        let present = 0;
        for (const student of cls.students) {
          total += 1;
          if (student.status === 'hadir') {
            hadir += 1;
            present += 1;
          } else if (student.status === 'telat') {
            telat += 1;
            present += 1;
          }
        }
        return { name: cls.className, present, total: cls.students.length };
      });
      setSummary({ hadir, telat, total, classes });
    } catch {
      setSummary(null);
    }
  }, []);

  useEffect(() => {
    void loadSession();
    void loadSummary();
    const interval = setInterval(() => void loadSession(), 15_000);
    const summaryInterval = setInterval(() => void loadSummary(), 60_000);
    return () => {
      clearInterval(interval);
      clearInterval(summaryInterval);
    };
  }, [loadSession, loadSummary]);

  const toggle = async () => {
    setPending(true);
    try {
      const updated = session?.status === 'open' ? await sessionsApi.close() : await sessionsApi.open();
      setSession(updated);
      toast.show({
        tone: 'success',
        title: updated.status === 'open' ? 'Sesi dibuka' : 'Sesi ditutup',
        message: updated.status === 'open' ? 'Murid sekarang bisa scan QR gerbang.' : 'Murid tidak bisa scan lagi hari ini.',
      });
      void loadSummary();
      setError(null);
    } catch (e) {
      toast.show({ tone: 'danger', title: 'Gagal mengubah sesi', message: e instanceof Error ? e.message : 'Terjadi kesalahan' });
    } finally {
      setPending(false);
    }
  };

  const open = session?.status === 'open';
  const belum = summary ? summary.total - summary.hadir - summary.telat : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 140 }}>
      <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={[styles.orb, styles.orbLarge]} />
        <View style={[styles.orb, styles.orbSmall]} />
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.name}>{user?.fullName}</Text>
          </View>
          <View style={styles.rolePill}>
            <Ionicons name="shield-checkmark" size={12} color={colors.textInverse} />
            <Text style={styles.rolePillText}>{user?.isAdmin ? 'Guru Admin' : 'Guru'}</Text>
          </View>
        </View>
        <Text style={styles.dateLabel}>
          {new Intl.DateTimeFormat('id-ID', { timeZone: jakarta, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        <Animated.View entering={FadeInDown.delay(40)}>
          <Card>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>Sesi Absensi Hari Ini</Text>
              {!loading ? (
                <View style={[styles.statePill, open ? styles.stateOpen : styles.stateClosed]}>
                  <View style={[styles.stateDot, { backgroundColor: open ? colors.primary500 : colors.textSecondary }]} />
                  <Text style={[styles.statePillText, !open && { color: colors.textSecondary }]}>{open ? 'Dibuka' : session ? 'Ditutup' : 'Belum dibuka'}</Text>
                </View>
              ) : null}
            </View>
            {session ? (
              <Text style={styles.sessionMeta}>
                {open ? 'Dibuka' : 'Ditutup'} {timeLabel(open ? session.openedAt : session.closedAt ?? session.openedAt)} WIB
              </Text>
            ) : (
              <Text style={styles.sessionMeta}>Belum ada sesi yang dibuka hari ini.</Text>
            )}
            <LiquidButton label={open ? 'Tutup Sesi' : 'Buka Sesi'} onPress={() => void toggle()} pending={pending} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(90)}>
          <Card>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>Kehadiran Hari Ini</Text>
              {summary && summary.total > 0 ? (
                <Text style={styles.cardSub}>{Math.round(((summary.hadir + summary.telat) / summary.total) * 100)}% absen</Text>
              ) : null}
            </View>
            {summary ? (
              summary.total === 0 ? (
                <Text style={styles.emptyNote}>Belum ada data murid untuk direkap.</Text>
              ) : (
                <>
                  <View style={styles.bigRow}>
                    <Text style={styles.bigValue}>{summary.hadir + summary.telat}</Text>
                    <Text style={styles.bigLabel}>dari {summary.total} murid sudah scan</Text>
                  </View>
                  <View style={styles.trackBar}>
                    {summary.hadir > 0 ? <View style={[styles.segHadir, { flex: summary.hadir }]} /> : null}
                    {summary.telat > 0 ? <View style={[styles.segTelat, { flex: summary.telat }]} /> : null}
                  </View>
                  <View style={styles.legendRow}>
                    <LegendDot color={colors.primary500} label={`${summary.hadir} Hadir`} />
                    <LegendDot color={colors.warning} label={`${summary.telat} Telat`} />
                    <LegendDot color={colors.borderStrong} label={`${belum} Belum`} />
                  </View>
                  {summary.classes.length > 0 ? (
                    <View style={styles.classList}>
                      {summary.classes.map((cls) => (
                        <View key={cls.name} style={styles.classRow}>
                          <View style={styles.classHead}>
                            <Text numberOfLines={1} style={styles.className}>{cls.name}</Text>
                            <Text style={styles.classCount}>{cls.present}/{cls.total}</Text>
                          </View>
                          <View style={styles.classTrack}>
                            {cls.present > 0 ? <View style={{ flex: cls.present, backgroundColor: colors.primary500 }} /> : null}
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </>
              )
            ) : (
              <Text style={styles.sessionMeta}>Memuat ringkasan...</Text>
            )}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140)}>
          <View style={styles.quickRow}>
            <PressableScale onPress={() => router.navigate('/(guru)/rekap')} style={{ flex: 1 }}>
              <View style={styles.quickTile}>
                <View style={styles.quickIcon}>
                  <Ionicons name="stats-chart-outline" size={18} color={colors.primary700} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={styles.quickTitle}>Rekap</Text>
                  <Text numberOfLines={1} style={styles.quickSub}>Harian & bulanan</Text>
                </View>
              </View>
            </PressableScale>
            <PressableScale onPress={() => router.navigate('/(guru)/murid')} style={{ flex: 1 }}>
              <View style={styles.quickTile}>
                <View style={styles.quickIcon}>
                  <Ionicons name="people-outline" size={18} color={colors.primary700} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={styles.quickTitle}>Data Murid</Text>
                  <Text numberOfLines={1} style={styles.quickSub}>Kelola siswa</Text>
                </View>
              </View>
            </PressableScale>
          </View>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.backgroundAlt, flex: 1 },
  hero: {
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    overflow: 'hidden',
    paddingBottom: spacing.lg + 4,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  orb: { borderRadius: radius.full, position: 'absolute' },
  orbLarge: { backgroundColor: 'rgba(111,203,163,0.16)', height: 150, right: -40, top: -50, width: 150 },
  orbSmall: { backgroundColor: 'rgba(255,255,255,0.07)', bottom: -34, height: 96, left: -24, width: 96 },
  heroTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  greeting: { ...type.body, color: 'rgba(255,255,255,0.78)' },
  name: { ...type.title, color: colors.textInverse, marginTop: 2 },
  rolePill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.full,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  rolePillText: { fontSize: 11, fontWeight: '700', color: colors.textInverse },
  dateLabel: { ...type.caption, color: 'rgba(255,255,255,0.62)', marginTop: 6 },
  content: { gap: spacing.md, padding: spacing.md },
  cardHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { ...type.heading, color: colors.textPrimary },
  cardSub: { ...type.caption, fontWeight: '700', color: colors.primary700 },
  statePill: {
    alignItems: 'center',
    borderRadius: radius.full,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  stateOpen: { backgroundColor: colors.primary100 },
  stateClosed: { backgroundColor: colors.surfaceMuted },
  stateDot: { borderRadius: radius.full, height: 7, width: 7 },
  statePillText: { fontSize: 12, fontWeight: '700', color: colors.primary700 },
  sessionMeta: { ...type.caption, color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.xs },
  error: { color: colors.danger, fontSize: type.caption.fontSize, marginTop: spacing.sm },
  bigRow: { alignItems: 'flex-end', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  bigValue: { fontSize: 40, fontWeight: '800', color: colors.primary700, lineHeight: 44 },
  bigLabel: { ...type.body, color: colors.textSecondary, paddingBottom: 6 },
  trackBar: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    flexDirection: 'row',
    height: 10,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  segHadir: { backgroundColor: colors.primary500 },
  segTelat: { backgroundColor: colors.warning },
  legendRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  legendItem: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  legendDot: { borderRadius: radius.full, height: 8, width: 8 },
  legendText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  classList: { gap: spacing.sm + 2, marginTop: spacing.md },
  classRow: { gap: 5 },
  classHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  className: { ...type.label, color: colors.textPrimary, flexShrink: 1 },
  classCount: { ...type.caption, fontWeight: '700', color: colors.textSecondary },
  classTrack: { backgroundColor: colors.surfaceMuted, borderRadius: radius.full, flexDirection: 'row', height: 4, overflow: 'hidden' },
  quickRow: { flexDirection: 'row', gap: spacing.sm },
  quickTile: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.sm + 2,
    minHeight: 68,
    padding: spacing.md,
    ...{
      shadowColor: '#0B3D2C',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 2,
    },
  },
  quickIcon: { alignItems: 'center', backgroundColor: colors.primary50, borderRadius: 10, height: 38, justifyContent: 'center', width: 38 },
  quickTitle: { ...type.label, color: colors.textPrimary },
  quickSub: { ...type.caption, color: colors.textSecondary },
  emptyNote: { ...type.caption, color: colors.textSecondary, marginTop: spacing.sm },
});
