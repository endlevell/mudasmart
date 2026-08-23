import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Badge } from '../../components/ui/badge';
import { EmptyState } from '../../components/ui/empty-state';
import { ScreenHeader } from '../../components/ui/screen-header';
import { Select } from '../../components/ui/select';
import { colors, radius, spacing, type } from '../../constants/theme';
import { attendanceApi, type HistoryItem } from '../../api/attendance.api';

const monthLabel = (month: string) =>
  new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(Number(month.slice(0, 4)), Number(month.slice(5)) - 1));

const lastMonths = (count: number) => {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return { label: monthLabel(value), value };
  });
};

const dayLabel = (ms: number) =>
  new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(ms));
const timeLabel = (ms: number) =>
  new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ms));

type Row = { key: string; kind: 'record'; item: HistoryItem } | { key: string; kind: 'absent'; date: string };

// Riwayat bulanan — hari bersesi tanpa record ditandai Tidak Hadir.
export default function RiwayatScreen() {
  const [month, setMonth] = useState(lastMonths(12)[0].value);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await attendanceApi.history(month);
      const recordedDays = new Set(result.data.map((item) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(item.scannedAt))));
      const absent: Row[] = result.sessionDates
        .filter((date) => !recordedDays.has(date))
        .map((date) => ({ key: `absent-${date}`, kind: 'absent' as const, date }));
      const records: Row[] = result.data.map((item) => ({ key: `rec-${item.id}`, kind: 'record' as const, item }));
      setRows([...records, ...absent]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat riwayat');
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Riwayat Absensi" subtitle="Rekap kehadiran per bulan" />
      <Select label="Bulan" onSelect={(value) => setMonth(value)} options={lastMonths(12)} value={month} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        contentContainerStyle={{ paddingBottom: 140 }}
        data={rows}
        keyExtractor={(item) => item.key}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item, index }) =>
          item.kind === 'record' ? (
            <Animated.View entering={FadeInDown.delay(index * 40)}>
            <View style={styles.row}>
              <View style={styles.dateCol}>
                <Text style={styles.day}>{dayLabel(item.item.scannedAt).split(',')[0]}</Text>
                <Text style={styles.dateNum}>{dayLabel(item.item.scannedAt).split(', ')[1]}</Text>
              </View>
              <View style={styles.mid}>
                <Text style={styles.time}>{timeLabel(item.item.scannedAt)} WIB</Text>
                <Text style={styles.meta}>{item.item.gateName}</Text>
              </View>
              <Badge label={item.item.status === 'hadir' ? 'Hadir' : 'Telat'} tone={item.item.status === 'hadir' ? 'success' : 'warning'} />
            </View>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.delay(index * 40)}>
            <View style={[styles.row, styles.absentRow]}>
              <View style={styles.dateCol}>
                <Text style={[styles.day, styles.muted]}>{dayLabel(new Date(`${item.date}T00:00:00+07:00`).getTime()).split(',')[0]}</Text>
                <Text style={[styles.dateNum, styles.muted]}>{dayLabel(new Date(`${item.date}T00:00:00+07:00`).getTime()).split(', ')[1]}</Text>
              </View>
              <View style={styles.mid}>
                <Text style={styles.meta}>Tanpa catatan kehadiran</Text>
              </View>
              <Badge label="Tidak Hadir" tone="danger" />
            </View>
            </Animated.View>
          )
        }
        ListEmptyComponent={!error ? <EmptyState title="Belum ada data" message="Riwayat absensi bulan ini masih kosong." /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.backgroundAlt, flex: 1, padding: spacing.md },
  error: { color: colors.danger, fontSize: type.caption.fontSize, marginBottom: spacing.sm },
  separator: { height: spacing.sm },
  row: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    ...{
      shadowColor: '#0B3D2C',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 2,
    },
  },
  absentRow: { opacity: 0.8 },
  dateCol: { alignItems: 'center', minWidth: 64 },
  day: { ...type.label, color: colors.primary700, textTransform: 'uppercase' },
  dateNum: { ...type.caption, color: colors.textPrimary },
  muted: { color: colors.textSecondary },
  mid: { flex: 1 },
  time: { ...type.bodyStrong, color: colors.textPrimary },
  meta: { ...type.caption, color: colors.textSecondary },
});
