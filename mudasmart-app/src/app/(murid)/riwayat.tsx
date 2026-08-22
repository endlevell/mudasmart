import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Select } from '../../components/ui/select';
import { colors, radius, spacing } from '../../constants/theme';
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
      <Select label="Bulan" onSelect={(value) => setMonth(value)} options={lastMonths(12)} value={month} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => item.key}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) =>
          item.kind === 'record' ? (
            <View style={styles.row}>
              <View>
                <Text style={styles.date}>{dayLabel(item.item.scannedAt)}</Text>
                <Text style={styles.meta}>{timeLabel(item.item.scannedAt)} WIB — {item.item.gateName}</Text>
              </View>
              <View style={[styles.badge, item.item.status === 'hadir' ? styles.hadir : styles.telat]}>
                <Text style={[styles.badgeText, { color: item.item.status === 'hadir' ? colors.primary700 : colors.warning }]}>
                  {item.item.status === 'hadir' ? 'Hadir' : 'Telat'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.row, styles.absentRow]}>
              <Text style={styles.meta}>{dayLabel(new Date(`${item.date}T00:00:00+07:00`).getTime())}</Text>
              <Text style={styles.absentText}>Tidak Hadir</Text>
            </View>
          )
        }
        ListEmptyComponent={!error ? <Text style={styles.empty}>Belum ada data bulan ini</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.backgroundAlt, flex: 1, padding: spacing.md },
  error: { color: colors.danger, fontSize: 13, marginBottom: spacing.sm },
  separator: { height: spacing.sm },
  row: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  absentRow: { opacity: 0.75 },
  date: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  meta: { color: colors.textSecondary, fontSize: 13 },
  badge: { borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  hadir: { backgroundColor: colors.primary100 },
  telat: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  absentText: { color: colors.danger, fontSize: 12, fontWeight: '700' },
  empty: { color: colors.textSecondary, marginTop: spacing.xl, textAlign: 'center' },
});
