import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { EmptyState } from '../../../components/ui/empty-state';
import { Input } from '../../../components/ui/input';
import { ScreenHeader } from '../../../components/ui/screen-header';
import { colors, spacing, type } from '../../../constants/theme';
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
    <ScrollView style={{ flex: 1, backgroundColor: colors.backgroundAlt }} contentContainerStyle={[styles.container, { paddingBottom: 140 }]}>
      <ScreenHeader title="Kelola Kelas" subtitle="Daftar kelas & wali kelas" />
      <View style={styles.content}>
      {items.map((item, index) => (
        <Animated.View key={String(item.id)} entering={FadeInDown.delay(index * 50)}>
          <Card>
            <Pressable disabled={!isAdmin} onPress={() => startEdit(item)} style={styles.row}>
              <View>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>Tingkat {item.gradeLevel} · {item.academicYear}</Text>
              </View>
              <Badge label={`${item.studentCount} murid`} tone="success" />
            </Pressable>
          </Card>
        </Animated.View>
      ))}
      {items.length === 0 ? (
        <EmptyState title="Belum ada kelas" message={isAdmin ? 'Tambahkan kelas pertama lewat formulir di bawah.' : 'Minta guru admin membuat kelas.'} />
      ) : null}

      {isAdmin ? (
        <Card style={styles.formCard}>
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
        </Card>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.backgroundAlt },
  content: { padding: spacing.md, gap: spacing.sm },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  name: { ...type.bodyStrong, color: colors.textPrimary },
  meta: { ...type.caption, color: colors.textSecondary },
  empty: { color: colors.textSecondary, marginTop: spacing.xl, textAlign: 'center' },
  formCard: { gap: spacing.xs, marginTop: spacing.md },
  formTitle: { ...type.heading, color: colors.primary700, marginBottom: spacing.sm },
  error: { color: colors.danger, fontSize: type.caption.fontSize, marginBottom: spacing.sm },
  cancel: { alignItems: 'center', marginTop: spacing.sm, padding: spacing.sm },
  cancelText: { color: colors.info, fontSize: type.caption.fontSize + 1, fontWeight: '600' },
});
