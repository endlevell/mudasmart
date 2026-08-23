import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { EmptyState } from '../../../components/ui/empty-state';
import { Select } from '../../../components/ui/select';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, radius, spacing, type } from '../../../constants/theme';
import { ScreenHeader } from '../../../components/ui/screen-header';
import { classesApi, type ClassRoom } from '../../../api/classes.api';
import { reportsApi, type DailyReport, type MonthlyReport } from '../../../api/reports.api';
import { useAuthStore } from '../../../store/auth-store';

const statusTone = (status: string | null): { tone: 'success' | 'warning' | 'danger' | 'neutral'; label: string } => {
  if (status === 'hadir') return { tone: 'success', label: 'Hadir' };
  if (status === 'telat') return { tone: 'warning', label: 'Telat' };
  if (status === 'tidak hadir') return { tone: 'danger', label: 'Tidak Hadir' };
  return { tone: 'neutral', label: '-' };
};

// Rekap guru — tab Harian/Bulanan + filter kelas + export xlsx.
export default function RekapScreen() {
  const accessToken = useAuthStore((state) => state.session?.accessToken);
  const [tab, setTab] = useState<'daily' | 'monthly'>('daily');
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [classId, setClassId] = useState<string | null>(null);
  const [daily, setDaily] = useState<DailyReport | null>(null);
  const [monthly, setMonthly] = useState<MonthlyReport | null>(null);
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
      const params = { classId: classId ? Number(classId) : undefined };
      if (tab === 'daily') setDaily(await reportsApi.daily(params));
      else setMonthly(await reportsApi.monthly(params));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat rekap');
    }
  }, [tab, classId]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportReport = async () => {
    if (!accessToken) return;
    setPending(true);
    try {
      await reportsApi.download(tab, accessToken, { classId: classId ? Number(classId) : undefined });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengekspor');
    } finally {
      setPending(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 140 }]}>
      <ScreenHeader title="Rekap Absensi" subtitle="Harian · Bulanan · Export Excel" />
      <View style={styles.content}>
      <View style={styles.tabs}>
        {(['daily', 'monthly'] as const).map((value) => (
          <Pressable key={value} onPress={() => setTab(value)} style={[styles.tab, tab === value && styles.tabActive]}>
            <Text style={[styles.tabText, tab === value && styles.tabTextActive]}>{value === 'daily' ? 'Harian' : 'Bulanan'}</Text>
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
          daily.classes.map((cls, index) => (
            <Animated.View key={String(cls.classId)} entering={FadeInDown.delay(index * 60)}>
              <Card style={styles.card}>
                <Text style={styles.classTitle}>{cls.className}</Text>
                {cls.students.map((student) => {
                  const badge = statusTone(student.status);
                  return (
                    <View key={student.id} style={styles.row}>
                      <View>
                        <Text style={styles.name}>{student.fullName}</Text>
                        <Text style={styles.meta}>NIS {student.nis}</Text>
                      </View>
                      <Badge label={badge.label} tone={badge.tone} />
                    </View>
                  );
                })}
              </Card>
            </Animated.View>
          ))
        )
      ) : null}

      {tab === 'monthly' && monthly ? (
        <Card style={styles.card}>
          <Text style={styles.classTitle}>{monthly.rows.length} murid · {monthly.sessionCount} hari bersesi</Text>
          {monthly.rows.map((row) => (
            <View key={row.studentId} style={styles.row}>
              <View>
                <Text style={styles.name}>{row.fullName}</Text>
                <Text style={styles.meta}>{row.className}</Text>
              </View>
              <View style={styles.countRow}>
                <Badge label={`${row.hadir} hadir`} tone="success" />
                <Badge label={`${row.telat} telat`} tone="warning" />
                <Badge label={`${row.tidakHadir} alfa`} tone="danger" />
              </View>
            </View>
          ))}
        </Card>
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
  row: { alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row' },
  name: { ...type.bodyStrong, color: colors.textPrimary },
  meta: { ...type.caption, color: colors.textSecondary },
  countRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  error: { color: colors.danger, fontSize: type.caption.fontSize },
});
