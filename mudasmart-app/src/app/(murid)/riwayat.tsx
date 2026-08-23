import { useCallback, useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { EmptyState } from '../../components/ui/empty-state';
import { Input } from '../../components/ui/input';
import { PressableScale } from '../../components/ui/pressable-scale';
import { ScreenHeader } from '../../components/ui/screen-header';
import { Select } from '../../components/ui/select';
import { toast } from '../../components/ui/toast';
import { colors, radius, spacing, type } from '../../constants/theme';
import { attendanceApi, type HistoryItem } from '../../api/attendance.api';
import { leavesApi, type LeaveRequest, type LeaveStatus } from '../../api/leaves.api';

const jakarta = 'Asia/Jakarta';

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
// Pengajuan umumnya untuk hari ini/beberapa hari terakhir.
const recentDateOptions = () => {
  const now = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - index);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return { label: new Intl.DateTimeFormat('id-ID', { timeZone: jakarta, weekday: 'long', day: 'numeric', month: 'long' }).format(date), value };
  });
};

const dayLabel = (ms: number) =>
  new Intl.DateTimeFormat('id-ID', { timeZone: jakarta, weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(ms));
const timeLabel = (ms: number) =>
  new Intl.DateTimeFormat('id-ID', { timeZone: jakarta, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ms));
const dateKeyOf = (value: number | Date) => new Intl.DateTimeFormat('en-CA', { timeZone: jakarta }).format(new Date(value));

type Row = { key: string; kind: 'record'; item: HistoryItem } | { key: string; kind: 'absent'; date: string };
type DayStatus = 'hadir' | 'telat' | 'izin' | 'alfa';

const WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const leaveStatusBadge: Record<LeaveStatus, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  approved: { label: 'Disetujui', tone: 'success' },
  pending: { label: 'Menunggu', tone: 'warning' },
  rejected: { label: 'Ditolak', tone: 'danger' },
};

// Riwayat bulanan — kalender warna per hari + pengajuan izin/sakit.
export default function RiwayatScreen() {
  const [month, setMonth] = useState(lastMonths(12)[0].value);
  const [rows, setRows] = useState<Row[]>([]);
  const [byDate, setByDate] = useState<Map<string, DayStatus>>(new Map());
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Form pengajuan
  const [formOpen, setFormOpen] = useState(false);
  const [leaveDate, setLeaveDate] = useState(recentDateOptions()[0].value);
  const [leaveType, setLeaveType] = useState<'sakit' | 'izin'>('sakit');
  const [reason, setReason] = useState('');
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await attendanceApi.history(month);
      const statusByDate = new Map<string, DayStatus>();
      result.data.forEach((item) => statusByDate.set(new Intl.DateTimeFormat('en-CA', { timeZone: jakarta }).format(new Date(item.scannedAt)), item.status));
      const approvedLeaveDates = new Set((result.leaves ?? []).map((leave) => leave.date));
      result.sessionDates.forEach((date) => {
        if (statusByDate.has(date)) return;
        statusByDate.set(date, approvedLeaveDates.has(date) ? 'izin' : 'alfa');
      });
      setByDate(statusByDate);

      const recordedDays = new Set(result.data.map((item) => dateKeyOf(item.scannedAt)));
      const absent: Row[] = result.sessionDates
        .filter((date) => !recordedDays.has(date) && !approvedLeaveDates.has(date))
        .map((date) => ({ key: `absent-${date}`, kind: 'absent' as const, date }));
      const records: Row[] = result.data.map((item) => ({ key: `rec-${item.id}`, kind: 'record' as const, item }));
      setRows([...records, ...absent]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat riwayat');
    }
  }, [month]);

  const loadLeaves = useCallback(async () => {
    try {
      setMyLeaves((await leavesApi.mine()).data);
    } catch {
      // daftar pengajuan bersifat pelengkap; biarkan kosong saat gagal
    }
  }, []);

  useEffect(() => {
    void load();
    void loadLeaves();
  }, [load, loadLeaves]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, allowsMultipleSelection: false });
    if (!result.canceled && result.assets[0]) setImage(result.assets[0]);
  };

  const submitLeave = async () => {
    if (reason.trim().length < 3) {
      toast.show({ tone: 'warning', title: 'Alasan terlalu pendek', message: 'Tuliskan alasan minimal 3 karakter.' });
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.set('date', leaveDate);
      form.set('type', leaveType);
      form.set('reason', reason.trim());
      if (image?.uri) form.append('image', { uri: image.uri, name: image.fileName ?? 'lampiran.jpg', type: image.mimeType ?? 'image/jpeg' } as unknown as Blob);
      await leavesApi.create(form);
      toast.show({ tone: 'success', title: 'Pengajuan terkirim', message: 'Menunggu persetujuan guru.' });
      setFormOpen(false);
      setReason('');
      setImage(null);
      void load();
      void loadLeaves();
    } catch (e) {
      toast.show({ tone: 'danger', title: 'Gagal mengirim', message: e instanceof Error ? e.message : 'Terjadi kesalahan' });
    } finally {
      setSubmitting(false);
    }
  };

  // Statistik bulan terpilih.
  let hadir = 0;
  let telat = 0;
  let izin = 0;
  let alfa = 0;
  byDate.forEach((status) => {
    if (status === 'hadir') hadir += 1;
    else if (status === 'telat') telat += 1;
    else if (status === 'izin') izin += 1;
    else alfa += 1;
  });
  const total = hadir + telat + izin + alfa;

  // Sel kalender: offset hari pertama + tanggal dalam bulan.
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5)) - 1;
  const firstOffset = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: ({ day: number; key: string; status: DayStatus | null } | null)[] = [
    ...Array.from({ length: firstOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const key = `${month}-${String(day).padStart(2, '0')}`;
      return { day, key, status: byDate.get(key) ?? null };
    }),
  ];

  const listHeader = (
    <View>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Select label="Bulan" onSelect={(value) => setMonth(value)} options={lastMonths(12)} value={month} />
        </View>
        <PressableScale onPress={() => setFormOpen(true)} style={styles.addButton}>
          <Ionicons name="add-circle" size={22} color={colors.primary700} />
          <Text style={styles.addText}>Ajukan Izin</Text>
        </PressableScale>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Animated.View entering={FadeInDown.delay(40)}>
        <Card style={{ marginBottom: spacing.md }}>
          <View style={styles.summaryHead}>
            <Text style={styles.summaryTitle}>Ringkasan {monthLabel(month)}</Text>
            <Text style={styles.summaryPct}>{total > 0 ? Math.round(((hadir + telat) / total) * 100) : 0}% kehadiran</Text>
          </View>

          {/* Kalender bulan ini */}
          <View style={styles.weekRow}>
            {WEEKDAYS.map((day) => (
              <Text key={day} style={styles.weekday}>
                {day}
              </Text>
            ))}
          </View>
          <View style={styles.grid}>
            {cells.map((cell, index) =>
              cell ? (
                <View key={cell.key} style={styles.cellWrap}>
                  <View
                    style={[
                      styles.dayCell,
                      cell.status === 'hadir' && styles.dayHadir,
                      cell.status === 'telat' && styles.dayTelat,
                      cell.status === 'izin' && styles.dayIzin,
                      cell.status === 'alfa' && styles.dayAlfa,
                    ]}
                  >
                    <Text style={[styles.dayNum, cell.status === 'hadir' || cell.status === 'telat' ? styles.dayNumLight : null]}>{cell.day}</Text>
                  </View>
                </View>
              ) : (
                <View key={`blank-${index}`} style={styles.cellWrap} />
              ),
            )}
          </View>

          <View style={styles.legendRow}>
            <Legend color={colors.primary500} label={`Hadir ${hadir}`} />
            <Legend color={colors.warning} label={`Telat ${telat}`} />
            <Legend color={colors.info} label={`Izin ${izin}`} />
            <Legend color={colors.danger} label={`Alfa ${alfa}`} />
          </View>

          {myLeaves.length > 0 ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Pengajuan Izin Saya</Text>
              {myLeaves.slice(0, 5).map((leave) => (
                <View key={leave.id} style={styles.leaveRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.leaveDate}>
                      {new Intl.DateTimeFormat('id-ID', { timeZone: jakarta, weekday: 'short', day: 'numeric', month: 'short' }).format(
                        new Date(`${leave.date}T00:00:00+07:00`),
                      )}{' '}
                      · {leave.type === 'sakit' ? 'Sakit' : 'Izin'}
                    </Text>
                    <Text numberOfLines={1} style={styles.meta}>
                      {leave.reason}
                    </Text>
                  </View>
                  <Badge label={leaveStatusBadge[leave.status].label} tone={leaveStatusBadge[leave.status].tone} />
                </View>
              ))}
            </>
          ) : null}
        </Card>
      </Animated.View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Riwayat Absensi" subtitle="Rekap kehadiran per bulan" />
      <View style={styles.content}>
        <FlatList
          contentContainerStyle={{ paddingBottom: 140 }}
          data={rows}
          keyExtractor={(item) => item.key}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={listHeader}
          renderItem={({ item, index }) =>
            item.kind === 'record' ? (
              <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 40)}>
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
              <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 40)}>
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

      {/* Form pengajuan izin/sakit */}
      <Modal animationType="slide" onRequestClose={() => setFormOpen(false)} visible={formOpen}>
        <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContent}>
          <View style={styles.formHead}>
            <Text style={styles.formTitle}>Ajukan Izin / Sakit</Text>
            <Pressable onPress={() => setFormOpen(false)} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          <Select label="Tanggal" onSelect={(value) => setLeaveDate(value)} options={recentDateOptions()} value={leaveDate} />
          <Select
            label="Jenis"
            onSelect={(value) => setLeaveType(value as 'sakit' | 'izin')}
            options={[
              { label: 'Sakit (dengan surat)', value: 'sakit' },
              { label: 'Izin', value: 'izin' },
            ]}
            value={leaveType}
          />
          <Input label="Alasan" onChangeText={setReason} placeholder="Contoh: demam tinggi, ada acara keluarga" value={reason} />
          <PressableScale onPress={() => void pickImage()} style={styles.attachButton}>
            <Ionicons name="image-outline" size={18} color={colors.primary700} />
            <Text numberOfLines={1} style={styles.attachText}>
              {image ? (image.fileName ?? 'Lampiran dipilih') : 'Lampirkan foto surat (opsional)'}
            </Text>
          </PressableScale>
          <Button label={submitting ? 'Mengirim...' : 'Kirim Pengajuan'} onPress={() => void submitLeave()} pending={submitting} />
          <Text style={styles.formNote}>Pengajuan akan ditinjau oleh guru sebelum status izin berlaku.</Text>
        </ScrollView>
      </Modal>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.backgroundAlt, flex: 1 },
  content: { flex: 1, padding: spacing.md },
  topRow: { alignItems: 'flex-end', flexDirection: 'row', gap: spacing.sm },
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.primary100,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 5,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
  },
  addText: { fontSize: type.caption.fontSize, fontWeight: '700', color: colors.primary700 },
  error: { color: colors.danger, fontSize: type.caption.fontSize, marginBottom: spacing.sm },
  separator: { height: spacing.sm },
  summaryHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  summaryTitle: { ...type.heading, color: colors.textPrimary },
  summaryPct: { ...type.caption, fontWeight: '700', color: colors.primary700 },
  weekRow: { flexDirection: 'row', marginTop: spacing.md },
  weekday: { flex: 1, fontSize: 11, fontWeight: '700', color: colors.textSecondary, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xs },
  cellWrap: { alignItems: 'center', paddingVertical: 3, width: `${100 / 7}%` },
  dayCell: { alignItems: 'center', borderColor: 'transparent', borderRadius: radius.full, borderWidth: 1.5, height: 34, justifyContent: 'center', width: 34 },
  dayHadir: { backgroundColor: colors.primary500 },
  dayTelat: { backgroundColor: colors.warning },
  dayIzin: { backgroundColor: colors.infoBg, borderColor: colors.info },
  dayAlfa: { backgroundColor: colors.dangerBg, borderColor: colors.danger },
  dayNum: { fontSize: 12, fontWeight: '600', color: colors.textPrimary },
  dayNumLight: { color: '#FFFFFF', fontWeight: '700' },
  legendRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  legendItem: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  legendDot: { borderRadius: radius.full, height: 8, width: 8 },
  legendText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginVertical: spacing.sm },
  sectionTitle: { ...type.label, color: colors.textSecondary, marginBottom: spacing.xs, textTransform: 'uppercase' },
  leaveRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  leaveDate: { ...type.bodyStrong, color: colors.textPrimary },
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
  formContainer: { backgroundColor: colors.backgroundAlt, flex: 1 },
  formContent: { paddingBottom: spacing.xxl, padding: spacing.lg },
  formHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md, marginTop: spacing.lg },
  formTitle: { ...type.title, color: colors.textPrimary },
  attachButton: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  attachText: { ...type.body, color: colors.textSecondary, flex: 1 },
  formNote: { ...type.caption, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' },
});
