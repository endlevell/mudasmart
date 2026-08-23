import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { EmptyState } from '../../components/ui/empty-state';
import { PressableScale } from '../../components/ui/pressable-scale';
import { Select } from '../../components/ui/select';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, radius, spacing, type } from '../../constants/theme';
import { ScreenHeader } from '../../components/ui/screen-header';
import { toast } from '../../components/ui/toast';
import { classesApi, type ClassRoom } from '../../api/classes.api';
import { attendanceApi } from '../../api/attendance.api';
import { leavesApi, type LeaveListItem } from '../../api/leaves.api';
import { reportsApi, type DailyReport, type MonthlyReport } from '../../api/reports.api';
import { useAuthStore } from '../../store/auth-store';

const statusTone = (status: string | null): { tone: 'success' | 'warning' | 'danger' | 'neutral' | 'info'; label: string } => {
  if (status === 'hadir') return { tone: 'success', label: 'Hadir' };
  if (status === 'telat') return { tone: 'warning', label: 'Telat' };
  if (status === 'izin') return { tone: 'info', label: 'Izin' };
  if (status === 'tidak hadir') return { tone: 'danger', label: 'Tidak Hadir' };
  return { tone: 'neutral', label: '-' };
};

const chipTones = {
  success: { bg: colors.primary100, fg: colors.primary700 },
  warning: { bg: colors.warningBg, fg: '#B45309' },
  danger: { bg: colors.dangerBg, fg: colors.danger },
  info: { bg: colors.infoBg, fg: colors.info },
};

// Chip angka rekap bulanan — muat di baris sendiri agar tidak meluber dari kartu.
function StatChip({ value, label, tone }: { value: number; label: string; tone: keyof typeof chipTones }) {
  const palette = chipTones[tone];
  return (
    <View style={[styles.chip, { backgroundColor: palette.bg }]}>
      <Text style={[styles.chipValue, { color: palette.fg }]}>{value}</Text>
      <Text style={[styles.chipLabel, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

interface ClassRate {
  name: string;
  hadirPct: number;
  telatPct: number;
  pct: number;
}

// Grafik batang horizontal-scroll — persentase kehadiran per kelas bulan ini.
function ClassBarChart({ data }: { data: ClassRate[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
      {data.map((item) => (
        <View key={item.name} style={styles.chartCol}>
          <Text style={styles.chartValue}>{item.pct}%</Text>
          <View style={styles.chartTrack}>
            {item.hadirPct > 0 ? <View style={[styles.chartSegHadir, { flex: item.hadirPct }]} /> : null}
            {item.telatPct > 0 ? <View style={[styles.chartSegTelat, { flex: item.telatPct }]} /> : null}
          </View>
          <Text numberOfLines={2} style={styles.chartLabel}>
            {item.name}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

// Rekap guru — tab Harian/Bulanan + grafik + filter kelas + export xlsx.
export default function RekapScreen() {
  const accessToken = useAuthStore((state) => state.session?.accessToken);
  const [tab, setTab] = useState<'daily' | 'monthly' | 'izin'>('daily');
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [classId, setClassId] = useState<string | null>(null);
  const [daily, setDaily] = useState<DailyReport | null>(null);
  const [monthly, setMonthly] = useState<MonthlyReport | null>(null);
  const [leaves, setLeaves] = useState<LeaveListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    classesApi
      .list()
      .then((result) => setClasses(result.data))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      if (tab === 'daily') setDaily(await reportsApi.daily({ classId: classId ? Number(classId) : undefined }));
      else if (tab === 'monthly') setMonthly(await reportsApi.monthly({ classId: classId ? Number(classId) : undefined }));
      else setLeaves((await leavesApi.list()).data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat rekap');
    }
  }, [tab, classId]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportReport = async () => {
    if (!accessToken || tab === 'izin') return;
    setPending(true);
    try {
      await reportsApi.download(tab, accessToken, { classId: classId ? Number(classId) : undefined });
      toast.show({ tone: 'success', title: 'Export berhasil', message: 'File Excel siap dibagikan.' });
      setError(null);
    } catch (e) {
      toast.show({ tone: 'danger', title: 'Gagal mengekspor', message: e instanceof Error ? e.message : 'Terjadi kesalahan' });
    } finally {
      setPending(false);
    }
  };

  const confirmCancel = (student: { fullName: string; recordId: number | null }) => {
    if (student.recordId == null) return;
    Alert.alert(
      'Batalkan Absensi',
      `Absensi ${student.fullName} akan dihapus. Murid bisa scan ulang setelah dibatalkan.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Batalkan Absensi',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await attendanceApi.cancelRecord(student.recordId!);
                toast.show({ tone: 'success', title: 'Absensi dibatalkan', message: `${student.fullName} bisa scan ulang sekarang.` });
                await load();
              } catch (e) {
                toast.show({ tone: 'danger', title: 'Gagal membatalkan', message: e instanceof Error ? e.message : 'Terjadi kesalahan' });
              }
            })();
          },
        },
      ],
    );
  };

  // Ringkasan harian dari data kelas yang sudah dimuat.
  let dailyHadir = 0;
  let dailyTelat = 0;
  let dailyTotal = 0;
  if (daily) {
    for (const cls of daily.classes) {
      for (const student of cls.students) {
        dailyTotal += 1;
        if (student.status === 'hadir') dailyHadir += 1;
        else if (student.status === 'telat') dailyTelat += 1;
      }
    }
  }
  const dailyPresent = dailyHadir + dailyTelat;

  // Grafik bulanan: persentase kehadiran per kelas.
  const classRates: ClassRate[] = [];
  if (monthly && monthly.sessionCount > 0) {
    const grouped = new Map<string, { hadir: number; telat: number; students: number }>();
    for (const row of monthly.rows) {
      const entry = grouped.get(row.className) ?? { hadir: 0, telat: 0, students: 0 };
      entry.hadir += row.hadir;
      entry.telat += row.telat;
      entry.students += 1;
      grouped.set(row.className, entry);
    }
    grouped.forEach((entry, name) => {
      const expected = entry.students * monthly.sessionCount;
      const hadirPct = Math.round((entry.hadir / expected) * 100);
      const telatPct = Math.round((entry.telat / expected) * 100);
      classRates.push({ name, hadirPct, telatPct, pct: Math.min(100, hadirPct + telatPct) });
    });
    classRates.sort((a, b) => b.pct - a.pct);
  }

  const reviewLeave = (leave: LeaveListItem, status: 'approved' | 'rejected') => {
    void (async () => {
      try {
        await leavesApi.review(leave.id, status);
        toast.show({
          tone: 'success',
          title: status === 'approved' ? 'Izin disetujui' : 'Izin ditolak',
          message: `${leave.fullName} · ${leave.date}`,
        });
        await load();
      } catch (e) {
        toast.show({ tone: 'danger', title: 'Gagal memproses', message: e instanceof Error ? e.message : 'Terjadi kesalahan' });
      }
    })();
  };

  const pendingLeaves = leaves.filter((leave) => leave.status === 'pending');
  const decidedLeaves = leaves.filter((leave) => leave.status !== 'pending');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.backgroundAlt }} contentContainerStyle={[styles.container, { paddingBottom: 140 }]}>
      <ScreenHeader title="Rekap Absensi" subtitle="Harian · Bulanan · Izin · Export" />
      <View style={styles.content}>
        <View style={styles.tabs}>
          {(['daily', 'monthly', 'izin'] as const).map((value) => (
            <Pressable key={value} onPress={() => setTab(value)} style={[styles.tab, tab === value && styles.tabActive]}>
              <Text style={[styles.tabText, tab === value && styles.tabTextActive]}>{value === 'daily' ? 'Harian' : value === 'monthly' ? 'Bulanan' : 'Izin'}</Text>
            </Pressable>
          ))}
        </View>

        <Select
          label="Filter Kelas"
          onSelect={(value) => setClassId(value)}
          options={[{ label: 'Semua Kelas', value: '' }, ...classes.map((c) => ({ label: c.name, value: String(c.id) }))]}
          placeholder="Semua Kelas"
          value={classId ?? ''}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {tab === 'daily' && daily ? (
          daily.classes.length === 0 ? (
            <EmptyState title="Belum ada murid" message="Tambahkan murid dan assign kelas terlebih dahulu." />
          ) : (
            <>
              <Animated.View entering={FadeInDown.delay(40)}>
                <Card>
                  <View style={styles.summaryHead}>
                    <Text style={styles.classTitle}>Ringkasan Hari Ini</Text>
                    <Text style={styles.summaryPct}>{Math.round((dailyPresent / Math.max(dailyTotal, 1)) * 100)}% absen</Text>
                  </View>
                  <View style={styles.bigRow}>
                    <Text style={styles.bigValue}>{dailyPresent}</Text>
                    <Text style={styles.bigLabel}>dari {dailyTotal} murid sudah scan</Text>
                  </View>
                  <View style={styles.trackBar}>
                    {dailyHadir > 0 ? <View style={[styles.segHadir, { flex: dailyHadir }]} /> : null}
                    {dailyTelat > 0 ? <View style={[styles.segTelat, { flex: dailyTelat }]} /> : null}
                  </View>
                  <View style={styles.legendRow}>
                    <Text style={styles.legendItem}>
                      <Text style={styles.legendDotHadir}>● </Text>Hadir {dailyHadir}
                    </Text>
                    <Text style={styles.legendItem}>
                      <Text style={styles.legendDotTelat}>● </Text>Telat {dailyTelat}
                    </Text>
                    <Text style={styles.legendItem}>
                      <Text style={styles.legendDotBelum}>● </Text>Belum {dailyTotal - dailyPresent}
                    </Text>
                  </View>
                </Card>
              </Animated.View>

              {daily.classes.map((cls, index) => (
                <Animated.View key={String(cls.classId)} entering={FadeInDown.delay(index * 60)}>
                  <Card style={styles.card}>
                    <View style={styles.classHead}>
                      <Text style={styles.classTitle}>{cls.className}</Text>
                      <Text style={styles.classCount}>{cls.students.length} murid</Text>
                    </View>
                    {cls.students.map((student) => {
                      const badge = statusTone(student.status);
                      return (
                        <View key={student.id} style={styles.row}>
                          <View>
                            <Text style={styles.name}>{student.fullName}</Text>
                            <Text style={styles.meta}>NIS {student.nis}</Text>
                          </View>
                          <View style={styles.rowActions}>
                            <Badge label={badge.label} tone={badge.tone} />
                            {student.recordId != null ? (
                              <Pressable hitSlop={8} onPress={() => confirmCancel(student)} style={styles.cancelBtn}>
                                <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
                              </Pressable>
                            ) : null}
                          </View>
                        </View>
                      );
                    })}
                  </Card>
                </Animated.View>
              ))}
            </>
          )
        ) : null}

        {tab === 'monthly' && monthly ? (
          <>
            {classRates.length > 0 ? (
              <Animated.View entering={FadeInDown.delay(40)}>
                <Card>
                  <View style={styles.summaryHead}>
                    <Text style={styles.classTitle}>Grafik Kehadiran per Kelas</Text>
                    <Text style={styles.classCount}>{monthly.sessionCount} hari bersesi</Text>
                  </View>
                  <ClassBarChart data={classRates} />
                  <View style={styles.legendRow}>
                    <Text style={styles.legendItem}>
                      <Text style={styles.legendDotHadir}>● </Text>Hadir
                    </Text>
                    <Text style={styles.legendItem}>
                      <Text style={styles.legendDotTelat}>● </Text>Telat
                    </Text>
                  </View>
                </Card>
              </Animated.View>
            ) : null}

            <Animated.View entering={FadeInDown.delay(90)}>
              <Card style={styles.card}>
                <Text style={styles.classTitle}>{monthly.rows.length} murid · {monthly.sessionCount} hari bersesi</Text>
                {monthly.rows.map((row) => (
                  <View key={row.studentId} style={styles.monthlyRow}>
                    <View style={styles.monthlyHead}>
                      <Text style={[styles.name, styles.nameShrink]}>{row.fullName}</Text>
                      <Text style={styles.meta}>{row.className}</Text>
                    </View>
              <View style={styles.countRow}>
                <StatChip value={row.hadir} label="Hadir" tone="success" />
                <StatChip value={row.telat} label="Telat" tone="warning" />
                <StatChip value={row.izin} label="Izin" tone="info" />
                <StatChip value={row.tidakHadir} label="Alfa" tone="danger" />
              </View>
                  </View>
                ))}
              </Card>
            </Animated.View>
          </>
        ) : null}

        {tab === 'izin' ? (
          <>
            <Animated.View entering={FadeInDown.delay(40)}>
              <Card>
                <Text style={styles.classTitle}>Menunggu Persetujuan</Text>
                {pendingLeaves.length === 0 ? (
                  <Text style={styles.emptyNote}>Tidak ada pengajuan baru.</Text>
                ) : (
                  pendingLeaves.map((leave) => (
                    <View key={leave.id} style={styles.leaveRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{leave.fullName}</Text>
                        <Text style={styles.meta}>
                          {leave.date} · {leave.type === 'sakit' ? 'Sakit' : 'Izin'}
                          {leave.className ? ` · ${leave.className}` : ''}
                        </Text>
                        <Text numberOfLines={2} style={styles.meta}>
                          {leave.reason}
                        </Text>
                      </View>
                      <View style={styles.leaveActions}>
                        <PressableScale onPress={() => reviewLeave(leave, 'approved')} style={[styles.leaveBtn, { backgroundColor: colors.primary100 }]}>
                          <Text style={[styles.leaveBtnText, { color: colors.primary700 }]}>Setujui</Text>
                        </PressableScale>
                        <PressableScale onPress={() => reviewLeave(leave, 'rejected')} style={[styles.leaveBtn, { backgroundColor: colors.dangerBg }]}>
                          <Text style={[styles.leaveBtnText, { color: colors.danger }]}>Tolak</Text>
                        </PressableScale>
                      </View>
                    </View>
                  ))
                )}
              </Card>
            </Animated.View>

            {decidedLeaves.length > 0 ? (
              <Animated.View entering={FadeInDown.delay(90)}>
                <Card>
                  <Text style={styles.classTitle}>Riwayat Keputusan</Text>
                  {decidedLeaves.map((leave) => (
                    <View key={leave.id} style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{leave.fullName}</Text>
                        <Text style={styles.meta}>
                          {leave.date} · {leave.type === 'sakit' ? 'Sakit' : 'Izin'}
                        </Text>
                      </View>
                      <Badge label={leave.status === 'approved' ? 'Disetujui' : 'Ditolak'} tone={leave.status === 'approved' ? 'success' : 'danger'} />
                    </View>
                  ))}
                </Card>
              </Animated.View>
            ) : null}
          </>
        ) : null}

        <Button label="Export ke Excel" onPress={() => void exportReport()} pending={pending} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.backgroundAlt },
  content: { gap: spacing.md, padding: spacing.md },
  tabs: { backgroundColor: colors.surfaceMuted, borderRadius: radius.full, flexDirection: 'row', padding: 4 },
  tab: { alignItems: 'center', borderRadius: radius.full, flex: 1, paddingVertical: spacing.sm },
  tabActive: { backgroundColor: colors.primary700 },
  tabText: { ...type.bodyStrong, color: colors.textSecondary },
  tabTextActive: { color: colors.textInverse },
  card: { gap: spacing.sm },
  classTitle: { ...type.heading, color: colors.primary700 },
  classHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  classCount: { ...type.caption, fontWeight: '600', color: colors.textSecondary },
  row: { alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row' },
  rowActions: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  cancelBtn: { alignItems: 'center', justifyContent: 'center', padding: 2 },
  name: { ...type.bodyStrong, color: colors.textPrimary },
  nameShrink: { flexShrink: 1 },
  meta: { ...type.caption, color: colors.textSecondary },
  monthlyRow: { gap: 6 },
  monthlyHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  countRow: { alignSelf: 'stretch', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { alignItems: 'center', borderRadius: radius.full, columnGap: 3, flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 3 },
  chipValue: { fontSize: 12, fontWeight: '800' },
  chipLabel: { fontSize: 11, fontWeight: '600' },
  summaryHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  summaryPct: { ...type.caption, fontWeight: '700', color: colors.primary700 },
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
  legendRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  legendItem: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  legendDotHadir: { color: colors.primary500 },
  legendDotTelat: { color: colors.warning },
  legendDotBelum: { color: colors.borderStrong },
  chartScroll: { marginTop: spacing.md },
  chartCol: { alignItems: 'center', minWidth: 64, paddingHorizontal: spacing.xs },
  chartValue: { fontSize: 12, fontWeight: '800', color: colors.primary700, marginBottom: 4 },
  chartTrack: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    flexDirection: 'column-reverse',
    height: 120,
    overflow: 'hidden',
    width: 28,
  },
  chartSegHadir: { backgroundColor: colors.primary500 },
  chartSegTelat: { backgroundColor: colors.warning },
  chartLabel: { fontSize: 10, fontWeight: '600', color: colors.textSecondary, marginTop: 6, textAlign: 'center' },
  leaveRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm },
  leaveActions: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  leaveBtn: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 6 },
  leaveBtnText: { fontSize: type.caption.fontSize, fontWeight: '700' },
  emptyNote: { ...type.caption, color: colors.textSecondary, marginTop: spacing.sm },
  error: { color: colors.danger, fontSize: type.caption.fontSize },
});
