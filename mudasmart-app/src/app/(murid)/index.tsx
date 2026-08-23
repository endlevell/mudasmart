import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, type Href } from 'expo-router';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { colors, gradients, radius, spacing, type } from '../../constants/theme';
import { attendanceApi } from '../../api/attendance.api';
import { useAuthStore } from '../../store/auth-store';

const jakarta = 'Asia/Jakarta';
const dateKey = (value: number | Date) => new Intl.DateTimeFormat('en-CA', { timeZone: jakarta }).format(new Date(value));
const timeLabel = (ms: number) =>
  new Intl.DateTimeFormat('id-ID', { timeZone: jakarta, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ms));

type DayStatus = 'hadir' | 'telat' | 'alfa';

interface MonthStats {
  hadir: number;
  telat: number;
  alfa: number;
  sessions: number;
}

interface WeekDay {
  key: string;
  label: string;
  status: DayStatus | null;
  isToday: boolean;
}

const greeting = () => {
  const hour = Number(new Intl.DateTimeFormat('id-ID', { timeZone: jakarta, hour: '2-digit', hour12: false }).format(new Date()));
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 19) return 'Selamat sore';
  return 'Selamat malam';
};

const steps: { icon: Extract<keyof typeof Ionicons.glyphMap, string>; title: string; sub: string }[] = [
  { icon: 'walk', title: 'Datang ke gerbang sekolah', sub: 'Kehadiran tercatat dari QR gerbang, bukan dari dalam kelas.' },
  { icon: 'scan', title: 'Buka tab Scan', sub: 'Tekan tombol hijau di tengah navigasi bawah.' },
  { icon: 'qr-code-outline', title: 'Arahkan kamera ke QR gerbang', sub: 'Pastikan kode QR masuk utuh ke dalam bingkai.' },
  { icon: 'location', title: 'Izinkan akses lokasi', sub: 'GPS aktif agar scan divalidasi dan diterima.' },
];

// Beranda murid — sambutan, status hari ini, statistik bulan berjalan, dan panduan absen.
export default function MuridDashboard() {
  const user = useAuthStore((state) => state.session?.user);
  const [today, setToday] = useState<{ status: DayStatus; time: string } | null>(null);
  const [stats, setStats] = useState<MonthStats | null>(null);
  const [week, setWeek] = useState<WeekDay[]>([]);

  const loadToday = useCallback(async () => {
    try {
      const record = (await attendanceApi.today()).data;
      setToday(record ? { status: record.status, time: `${timeLabel(record.scannedAt)} WIB` } : null);
    } catch {
      setToday(null);
    }
  }, []);

  const loadStats = useCallback(async () => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
    try {
      const [current, previous] = await Promise.all([attendanceApi.history(thisMonth), attendanceApi.history(prevMonth)]);
      const byDate = new Map<string, DayStatus>();
      for (const source of [previous, current]) {
        source.data.forEach((item) => byDate.set(dateKey(item.scannedAt), item.status));
        source.sessionDates.forEach((date) => {
          if (!byDate.has(date)) byDate.set(date, 'alfa');
        });
      }
      let hadir = 0;
      let telat = 0;
      let alfa = 0;
      byDate.forEach((status, date) => {
        if (!date.startsWith(thisMonth)) return;
        if (status === 'hadir') hadir += 1;
        else if (status === 'telat') telat += 1;
        else alfa += 1;
      });
      setStats({ hadir, telat, alfa, sessions: current.sessionDates.length });

      const days: Date[] = [];
      const cursor = new Date(now);
      // Hari sekolah saja (Senin–Jumat), 5 hari terakhir termasuk hari ini.
      while (days.length < 5) {
        const dayOfWeek = cursor.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) days.push(new Date(cursor));
        cursor.setDate(cursor.getDate() - 1);
      }
      days.reverse();
      setWeek(
        days.map((day) => {
          const key = dateKey(day);
          return {
            key,
            label: new Intl.DateTimeFormat('id-ID', { timeZone: jakarta, weekday: 'short' }).format(day),
            status: byDate.get(key) ?? null,
            isToday: key === dateKey(now),
          };
        }),
      );
    } catch {
      setStats(null);
      setWeek([]);
    }
  }, []);

  useEffect(() => {
    void loadToday();
    void loadStats();
    const interval = setInterval(() => void loadToday(), 30_000);
    return () => clearInterval(interval);
  }, [loadToday, loadStats]);

  const present = stats ? stats.hadir + stats.telat : 0;
  const pct = stats && stats.sessions > 0 ? Math.round((present / stats.sessions) * 100) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 140 }}>
      <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={[styles.orb, styles.orbLarge]} />
        <View style={[styles.orb, styles.orbSmall]} />
        <Text style={styles.greeting}>{greeting()},</Text>
        <Text style={styles.name}>{user?.fullName}</Text>
        <Text style={styles.dateLabel}>
          {new Intl.DateTimeFormat('id-ID', { timeZone: jakarta, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        <Animated.View entering={FadeInDown.delay(40)}>
          <Card style={styles.statusCard}>
            <View
              style={[
                styles.statusIcon,
                { backgroundColor: today ? (today.status === 'hadir' ? colors.primary100 : colors.warningBg) : colors.surfaceMuted },
              ]}
            >
              <Ionicons
                name={today ? (today.status === 'hadir' ? 'checkmark' : 'time') : 'qr-code-outline'}
                size={20}
                color={today ? (today.status === 'hadir' ? colors.primary700 : '#B45309') : colors.textSecondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>{today ? (today.status === 'hadir' ? 'Kamu sudah absen' : 'Tercatat telat') : 'Belum absen hari ini'}</Text>
              <Text style={styles.statusSub}>{today ? today.time : 'Gunakan tombol Scan di navigasi bawah saat sesi dibuka.'}</Text>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(90)}>
          <Card>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>Absensi Bulan Ini</Text>
              <Text style={styles.cardSub}>
                {new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date())}
              </Text>
            </View>
            {stats ? (
              <View style={styles.chartBody}>
                <View style={styles.ringWrap}>
                  <Svg width={104} height={104}>
                    <Circle cx={52} cy={52} r={44} stroke={colors.surfaceMuted} strokeWidth={11} fill="none" />
                    <Circle
                      cx={52}
                      cy={52}
                      r={44}
                      stroke={colors.primary500}
                      strokeWidth={11}
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 44}`}
                      strokeDashoffset={`${2 * Math.PI * 44 * (1 - pct / 100)}`}
                      transform="rotate(-90 52 52)"
                    />
                  </Svg>
                  <View pointerEvents="none" style={styles.ringCenter}>
                    <Text style={styles.ringValue}>{pct}%</Text>
                    <Text style={styles.ringLabel}>kehadiran</Text>
                  </View>
                </View>
                <View style={styles.legend}>
                  <LegendRow color={colors.primary500} value={stats.hadir} label="Hadir" />
                  <LegendRow color={colors.warning} value={stats.telat} label="Telat" />
                  <LegendRow color={colors.danger} value={stats.alfa} label="Alfa" />
                  <Text style={styles.legendFoot}>{stats.sessions} hari bersesi bulan ini</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.loading}>Memuat statistik...</Text>
            )}
          </Card>
        </Animated.View>

        {week.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(140)}>
            <Card>
              <Text style={styles.cardTitle}>5 Hari Sekolah Terakhir</Text>
              <View style={styles.weekRow}>
                {week.map((day) => (
                  <View key={day.key} style={styles.dayCol}>
                    <Text style={styles.dayLabel}>{day.label}</Text>
                    <View
                      style={[
                        styles.dayPill,
                        day.status === 'hadir' && { backgroundColor: colors.primary500 },
                        day.status === 'telat' && { backgroundColor: colors.warning },
                        day.status === 'alfa' && { backgroundColor: colors.dangerBg },
                        day.isToday && styles.dayPillToday,
                      ]}
                    >
                      {day.status === 'hadir' ? <Ionicons name="checkmark" size={14} color={colors.textInverse} /> : null}
                      {day.status === 'telat' ? <Ionicons name="time" size={13} color={colors.textInverse} /> : null}
                      {day.status === 'alfa' ? <Ionicons name="close" size={14} color={colors.danger} /> : null}
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(190)}>
          <Card>
            <Text style={styles.cardTitle}>Cara Melakukan Absensi</Text>
            <View style={{ marginTop: spacing.sm }}>
              {steps.map((step, index) => (
                <View key={step.title} style={styles.step}>
                  {index < steps.length - 1 ? <View style={styles.stepLine} /> : null}
                  <View style={styles.stepIcon}>
                    <Ionicons name={step.icon} size={17} color={colors.primary700} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.stepSub}>{step.sub}</Text>
                  </View>
                </View>
              ))}
            </View>
            <Button variant="ghost" label="Buka Kamera Scan" onPress={() => router.navigate('/(murid)/scan' as Href)} />
          </Card>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

function LegendRow({ color, value, label }: { color: string; value: number; label: string }) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendValue}>{value}</Text>
      <Text style={styles.legendLabel}>{label}</Text>
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
  greeting: { ...type.body, color: 'rgba(255,255,255,0.78)' },
  name: { ...type.title, color: colors.textInverse, marginTop: 2 },
  dateLabel: { ...type.caption, color: 'rgba(255,255,255,0.62)', marginTop: 6 },
  content: { gap: spacing.md, padding: spacing.md },
  statusCard: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  statusIcon: { alignItems: 'center', borderRadius: radius.full, height: 42, justifyContent: 'center', width: 42 },
  statusTitle: { ...type.bodyStrong, color: colors.textPrimary },
  statusSub: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  cardHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { ...type.heading, color: colors.textPrimary },
  cardSub: { ...type.caption, color: colors.textSecondary },
  chartBody: { alignItems: 'center', flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md },
  ringWrap: { alignItems: 'center', justifyContent: 'center' },
  ringCenter: { alignItems: 'center', left: 0, position: 'absolute', right: 0 },
  ringValue: { fontSize: 22, fontWeight: '800', color: colors.primary700 },
  ringLabel: { fontSize: 10, fontWeight: '600', color: colors.textSecondary },
  legend: { flex: 1, gap: spacing.sm },
  legendRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  dot: { borderRadius: radius.full, height: 9, width: 9 },
  legendValue: { ...type.bodyStrong, color: colors.textPrimary, minWidth: 22 },
  legendLabel: { ...type.body, color: colors.textSecondary },
  legendFoot: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  loading: { ...type.caption, color: colors.textSecondary, marginTop: spacing.md },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  dayCol: { alignItems: 'center', gap: 6 },
  dayLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, textTransform: 'capitalize' },
  dayPill: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: 'transparent',
    borderRadius: 12,
    borderWidth: 2,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  dayPillToday: { borderColor: colors.primary700 },
  step: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  stepLine: { backgroundColor: colors.primary100, bottom: -4, left: 17, position: 'absolute', top: 38, width: 2 },
  stepIcon: {
    alignItems: 'center',
    backgroundColor: colors.primary50,
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
    zIndex: 1,
  },
  stepTitle: { ...type.bodyStrong, color: colors.textPrimary },
  stepSub: { ...type.caption, color: colors.textSecondary, marginTop: 1 },
});
