import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Select } from '../../../components/ui/select';
import { colors, radius, spacing } from '../../../constants/theme';
import { classesApi, type ClassRoom } from '../../../api/classes.api';
import { studentsApi, type Student } from '../../../api/students.api';

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

  return (
    <View style={styles.container}>
      <TextInput
        onChangeText={(value) => setSearch(value)}
        placeholder="Cari nama atau NIS"
        placeholderTextColor={colors.textSecondary}
        style={styles.search}
        value={search}
      />
      <Select
        label="Filter Kelas"
        onSelect={(value) => setClassId(value)}
        options={[{ label: 'Semua Kelas', value: '' }, ...classes.map((c) => ({ label: c.name, value: String(c.id) }))]}
        placeholder="Semua Kelas"
        value={classId ?? ''}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push({ pathname: '/(guru)/murid/[id]', params: { id: item.id } })} style={styles.row}>
            <View>
              <Text style={styles.name}>{item.fullName}</Text>
              <Text style={styles.meta}>
                NIS {item.nis}
                {item.className ? ` — ${item.className}` : ''}
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={!error ? <Text style={styles.empty}>Tidak ada murid</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.backgroundAlt, flex: 1, padding: spacing.md },
  search: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 16,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  error: { color: colors.danger, fontSize: 13, marginBottom: spacing.sm },
  separator: { height: spacing.sm },
  row: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  name: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  meta: { color: colors.textSecondary, fontSize: 13 },
  empty: { color: colors.textSecondary, marginTop: spacing.xl, textAlign: 'center' },
});
