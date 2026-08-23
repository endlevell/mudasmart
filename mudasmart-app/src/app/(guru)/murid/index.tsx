import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Card } from '../../../components/ui/card';
import { EmptyState } from '../../../components/ui/empty-state';
import { ScreenHeader } from '../../../components/ui/screen-header';
import { Select } from '../../../components/ui/select';
import { colors, radius, spacing, type } from '../../../constants/theme';
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
      <ScreenHeader title="Kelola Murid" subtitle="Cari, filter, dan kelola data murid" />
      <TextInput
        onChangeText={(value) => setSearch(value)}
        placeholder="Cari nama atau NIS"
        placeholderTextColor={colors.textSecondary}
        style={[styles.search, { marginTop: spacing.md }]}
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
        contentContainerStyle={{ paddingBottom: 140 }}
        data={students}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 40)}>
          <Card>
            <Pressable onPress={() => router.push({ pathname: '/(guru)/murid/[id]', params: { id: item.id } })} style={styles.row}>
              <View>
                <Text style={styles.name}>{item.fullName}</Text>
                <Text style={styles.meta}>NIS {item.nis}{item.className ? ` · ${item.className}` : ''}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          </Card>
          </Animated.View>
        )}
        ListEmptyComponent={!error ? <EmptyState title="Tidak ada murid" message="Coba ubah kata kunci atau filter kelas." /> : null}
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
    fontSize: type.body.fontSize,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  error: { color: colors.danger, fontSize: type.caption.fontSize, marginBottom: spacing.sm },
  separator: { height: spacing.sm },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  name: { ...type.bodyStrong, color: colors.textPrimary },
  meta: { ...type.caption, color: colors.textSecondary },
  chevron: { color: colors.primary500, fontSize: 26, fontWeight: '700' },
});
