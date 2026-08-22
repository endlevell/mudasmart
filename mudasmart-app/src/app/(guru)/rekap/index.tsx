import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/ui/button';
import { Select } from '../../../components/ui/select';
import { colors, radius, spacing } from '../../../constants/theme';
import { classesApi, type ClassRoom } from '../../../api/classes.api';
import { reportsApi, type DailyReport, type MonthlyReport } from '../../../api/reports.api';
import { useAuthStore } from '../../../store/auth-store';

const statusStyle = (status: string | null) => {
  if (status === 'hadir') return { bg: colors.primary100, color: colors.primary700, label: 'Hadir' };
  if (status === 'telat') return { bg: '#FEF3C7', color: colors.warning, label: 'Telat' };
  if (status === 'tidak hadir') return { bg: '#FEE2E2', color: colors.danger, label: 'Tidak Hadir' };
  return { bg: '#F3F4F6', color: colors.textSecondary, label: '-' };
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
    <ScrollView contentContainerStyle={styles.container}>
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
          <Text style={styles.empty}>Belum ada murid</Text>
        ) : (
          daily.classes.map((cls) => (
            <View key={String(cls.classId)} style={styles.card}>
              <Text style={styles.classTitle}>{cls.className}</Text>
              {cls.students.map((student) => {
                const badge = statusStyle(student.status);
                return (
                  <View key={student.id} style={styles.row}>
                    <View>
                      <Text style={styles.name}>{student.fullName}</Text>
                      <Text style={styles.meta}>NIS {student.nis}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )
      ) : null}

      {tab === 'monthly' && monthly ? (
        <View style={styles.card}>
          <Text style={styles.classTitle}>{monthly.rows.length} murid — {monthly.sessionCount} hari bersesi</Text>
          {monthly.rows.map((row) => (
            <View key={row.studentId} style={styles.row}>
              <View>
                <Text style={styles.name}>{row.fullName}</Text>
                <Text style={styles.meta}>{row.className}</Text>
              </View>
              <Text style={styles.counts}>
                <Text style={{ color: colors.primary700 }}>{row.hadir} hadir</Text>
                {' · '}
                <Text style={{ color: colors.warning }}>{row.telat} telat</Text>
                {' · '}
                <Text style={{ color: colors.danger }}>{row.tidakHadir} alfa</Text>
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Button label="Export ke Excel" onPress={() => void exportReport()} pending={pending} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.backgroundAlt, gap: spacing.md, padding: spacing.md },
  tabs: { flexDirection: 'row', gap: spacing.sm },
  tab: { alignItems: 'center', borderRadius: radius.md, flex: 1, paddingVertical: spacing.sm },
  tabActive: { backgroundColor: colors.primary700 },
  tabText: { color: colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF' },
  card: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  classTitle: { color: colors.primary700, fontSize: 15, fontWeight: '700' },
  row: { alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row' },
  name: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  meta: { color: colors.textSecondary, fontSize: 12 },
  counts: { fontSize: 12, fontWeight: '600' },
  badge: { borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  badgeText: { fontSize: 12, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 13 },
  empty: { color: colors.textSecondary, textAlign: 'center' },
});
