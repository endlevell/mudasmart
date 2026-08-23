import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Card } from '../../../components/ui/card';
import { EmptyState } from '../../../components/ui/empty-state';
import { PressableScale } from '../../../components/ui/pressable-scale';
import { ScreenHeader } from '../../../components/ui/screen-header';
import { Select } from '../../../components/ui/select';
import { colors, radius, spacing, type } from '../../../constants/theme';
import { classesApi, type ClassRoom } from '../../../api/classes.api';
import { studentsApi, type Student } from '../../../api/students.api';

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

  return (
    <View style={styles.container}>
      <ScreenHeader title="Kelola Murid" subtitle="Cari, filter, dan kelola data murid" />
      <View style={styles.content}>
        <View style={[styles.searchWrap, { marginTop: spacing.md }]}>
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
  searchWrap: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm + 2,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  search: { color: colors.textPrimary, flex: 1, fontSize: type.body.fontSize, paddingVertical: 14 },
  searchClear: { padding: 2 },
  count: { ...type.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  error: { color: colors.danger, fontSize: type.caption.fontSize, marginBottom: spacing.sm },
  separator: { height: spacing.sm },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  avatar: { alignItems: 'center', backgroundColor: colors.primary100, borderRadius: radius.full, height: 44, justifyContent: 'center', width: 44 },
  avatarText: { color: colors.primary700, fontSize: 14, fontWeight: '800' },
  name: { ...type.bodyStrong, color: colors.textPrimary },
  meta: { ...type.caption, color: colors.textSecondary, marginTop: 1 },
});
