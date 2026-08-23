import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Card } from '../../../components/ui/card';
import { EmptyState } from '../../../components/ui/empty-state';
import { PressableScale } from '../../../components/ui/pressable-scale';
import { ScreenHeader } from '../../../components/ui/screen-header';
import { Select } from '../../../components/ui/select';
import { toast } from '../../../components/ui/toast';
import { colors, radius, spacing, type } from '../../../constants/theme';
import { classesApi, type ClassRoom } from '../../../api/classes.api';
import { studentsApi, type Student } from '../../../api/students.api';
import { parseCsv } from '../../../utils/csv';

const initialsOf = (fullName: string) =>
  fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

export default function KelolaMuridScreen() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (q: string, cid: string | null) => {
    try {
      const result = await studentsApi.list({ q: q.trim() || undefined, classId: cid ? Number(cid) : undefined });
      setStudents(result.data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat murid');
    }
  }, []);

  useEffect(() => {
    void load(search, classId);
  }, [load, search, classId]);

  useEffect(() => {
    classesApi
      .list()
      .then((result) => setClasses(result.data))
      .catch(() => {});
  }, []);

  // Import CSV: kolom yang diharapkan — Nama, Email, NIS, Kelas (opsional).
  const importCsv = async () => {
    const picked = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'text/plain'], copyToCacheDirectory: true });
    if (picked.canceled) return;
    try {
      const text = await FileSystem.readAsStringAsync(picked.assets[0].uri);
      const table = parseCsv(text);
      if (table.length < 2) throw new Error('File kosong atau hanya berisi header');
      const header = table[0].map((cell) => cell.trim().toLowerCase());
      const col = (...names: string[]) => header.findIndex((h) => names.some((n) => h === n));
      const iName = col('nama', 'nama lengkap', 'fullname', 'name');
      const iEmail = col('email');
      const iNis = col('nis');
      const iClass = col('kelas', 'class');
      if (iName < 0 || iEmail < 0 || iNis < 0) throw new Error('Header wajib memuat kolom: Nama, Email, NIS');

      const rows = table.slice(1).map((cells) => ({
        fullName: cells[iName]?.trim() ?? '',
        email: cells[iEmail]?.trim() ?? '',
        nis: cells[iNis]?.trim() ?? '',
        ...(iClass >= 0 && cells[iClass]?.trim() ? { className: cells[iClass].trim() } : {}),
      }));
      Alert.alert('Import Murid', `${rows.length} baris akan diimpor sebagai akun murid baru. Lanjutkan?`, [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Import',
          onPress: () => {
            void (async () => {
              try {
                const result = await studentsApi.importStudents(rows);
                const failedText = result.failed.slice(0, 4).map((f) => `Baris ${f.row}: ${f.reason}`).join('\n');
                Alert.alert(
                  'Hasil Import',
                  `${result.created} akun dibuat.${result.failed.length ? `\n\n${result.failed.length} gagal:\n${failedText}${result.failed.length > 4 ? '\n...' : ''}` : ''}\n\nKata sandi sementara tiap murid ada di respons admin — bagikan ke masing-masing murid.`,
                );
                toast.show({ tone: result.failed.length ? 'warning' : 'success', title: 'Import selesai', message: `${result.created} akun dibuat, ${result.failed.length} gagal.` });
                void load(search, classId);
              } catch (e) {
                toast.show({ tone: 'danger', title: 'Gagal import', message: e instanceof Error ? e.message : 'Terjadi kesalahan' });
              }
            })();
          },
        },
      ]);
    } catch (e) {
      toast.show({ tone: 'danger', title: 'Gagal membaca file', message: e instanceof Error ? e.message : 'Pastikan format CSV benar.' });
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Kelola Murid" subtitle="Cari, filter, dan kelola data murid" />
      <View style={styles.content}>
      <View style={styles.topRow}>
        <View style={[styles.searchWrap, { flex: 1 }]}>
          <Ionicons name="search" size={17} color={colors.textSecondary} />
          <TextInput
            onChangeText={(value) => setSearch(value)}
            placeholder="Cari nama atau NIS"
            placeholderTextColor={colors.textSecondary}
            style={styles.search}
            value={search}
          />
          {search.length > 0 ? (
            <Pressable hitSlop={8} onPress={() => setSearch('')} style={styles.searchClear}>
              <Ionicons name="close-circle" size={16} color={colors.borderStrong} />
            </Pressable>
          ) : null}
        </View>
        <PressableScale onPress={() => void importCsv()} style={styles.importButton}>
          <Ionicons name="cloud-upload-outline" size={18} color={colors.primary700} />
          <Text style={styles.importText}>CSV</Text>
        </PressableScale>
      </View>
        <Select
          label="Filter Kelas"
          onSelect={(value) => setClassId(value)}
          options={[{ label: 'Semua Kelas', value: '' }, ...classes.map((c) => ({ label: c.name, value: String(c.id) }))]}
          placeholder="Semua Kelas"
          value={classId ?? ''}
        />
        {!error && students.length > 0 ? <Text style={styles.count}>{students.length} murid ditemukan</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <FlatList
          contentContainerStyle={{ paddingBottom: 140 }}
          data={students}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 12) * 40)}>
              <Card>
                <PressableScale
                  onPress={() => router.push({ pathname: '/(guru)/murid/[id]', params: { id: item.id } })}
                  style={styles.row}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initialsOf(item.fullName)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={styles.name}>{item.fullName}</Text>
                    <Text numberOfLines={1} style={styles.meta}>
                      NIS {item.nis}
                      {item.className ? ` · ${item.className}` : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.primary500} />
                </PressableScale>
              </Card>
            </Animated.View>
          )}
          ListEmptyComponent={!error ? <EmptyState title="Tidak ada murid" message="Coba ubah kata kunci atau filter kelas." /> : null}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.backgroundAlt, flex: 1 },
  content: { flex: 1, padding: spacing.md },
  topRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  searchWrap: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  search: { color: colors.textPrimary, flex: 1, fontSize: type.body.fontSize, paddingVertical: 14 },
  searchClear: { padding: 2 },
  importButton: { alignSelf: 'stretch', alignItems: 'center', backgroundColor: colors.primary100, borderRadius: radius.md, justifyContent: 'center', paddingHorizontal: spacing.md },
  importText: { fontSize: 11, fontWeight: '800', color: colors.primary700 },
  count: { ...type.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  error: { color: colors.danger, fontSize: type.caption.fontSize, marginBottom: spacing.sm },
  separator: { height: spacing.sm },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  avatar: { alignItems: 'center', backgroundColor: colors.primary100, borderRadius: radius.full, height: 44, justifyContent: 'center', width: 44 },
  avatarText: { color: colors.primary700, fontSize: 14, fontWeight: '800' },
  name: { ...type.bodyStrong, color: colors.textPrimary },
  meta: { ...type.caption, color: colors.textSecondary, marginTop: 1 },
});
