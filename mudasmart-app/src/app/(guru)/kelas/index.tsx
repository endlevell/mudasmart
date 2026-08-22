import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { colors, radius, spacing } from '../../../constants/theme';
import { classesApi, type ClassRoom } from '../../../api/classes.api';
import { useAuthStore } from '../../../store/auth-store';

export default function KelolaKelasScreen() {
  const isAdmin = useAuthStore((state) => state.session?.user.isAdmin ?? false);
  const [items, setItems] = useState<ClassRoom[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ClassRoom | null>(null);
  const [form, setForm] = useState({ name: '', gradeLevel: '', academicYear: '' });
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems((await classesApi.list()).data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat kelas');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startEdit = (item: ClassRoom) => {
    setEditing(item);
    setForm({ name: item.name, gradeLevel: String(item.gradeLevel), academicYear: item.academicYear });
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ name: '', gradeLevel: '', academicYear: '' });
  };

  const submit = async () => {
    const payload = { name: form.name.trim(), gradeLevel: Number(form.gradeLevel), academicYear: form.academicYear.trim() };
    if (!payload.name || !Number.isInteger(payload.gradeLevel) || !/^\d{4}\/\d{4}$/.test(payload.academicYear)) {
      setError('Nama wajib diisi, tingkat angka, tahun ajaran format YYYY/YYYY');
      return;
    }
    setPending(true);
    try {
      if (editing) await classesApi.update(editing.id, payload);
      else await classesApi.create(payload);
      resetForm();
      await load();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan kelas');
    } finally {
      setPending(false);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <Pressable disabled={!isAdmin} onPress={() => startEdit(item)} style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.academicYear}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.studentCount} murid</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Belum ada kelas</Text>}
      />

      {isAdmin ? (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{editing ? `Edit ${editing.name}` : 'Tambah Kelas'}</Text>
          <Input label="Nama Kelas" onChangeText={(name) => setForm((prev) => ({ ...prev, name }))} placeholder="XI IPA 1" value={form.name} />
          <Input keyboardType="number-pad" label="Tingkat" onChangeText={(gradeLevel) => setForm((prev) => ({ ...prev, gradeLevel }))} placeholder="10" value={form.gradeLevel} />
          <Input label="Tahun Ajaran" onChangeText={(academicYear) => setForm((prev) => ({ ...prev, academicYear }))} placeholder="2026/2027" value={form.academicYear} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={editing ? 'Simpan' : 'Tambah'} onPress={submit} pending={pending} />
          {editing ? (
            <Pressable onPress={resetForm} style={styles.cancel}>
              <Text style={styles.cancelText}>Batal</Text>
            </Pressable>
          ) : null}
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.backgroundAlt, flex: 1, padding: spacing.md },
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
  rowMain: { gap: 2 },
  name: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  meta: { color: colors.textSecondary, fontSize: 13 },
  badge: { backgroundColor: colors.primary100, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  badgeText: { color: colors.primary700, fontSize: 12, fontWeight: '600' },
  empty: { color: colors.textSecondary, marginTop: spacing.xl, textAlign: 'center' },
  formCard: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  formTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '600', marginBottom: spacing.md },
  error: { color: colors.danger, fontSize: 13, marginBottom: spacing.sm },
  cancel: { alignItems: 'center', marginTop: spacing.sm, padding: spacing.sm },
  cancelText: { color: colors.info, fontSize: 14 },
});
