import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { colors, spacing, type } from '../../../constants/theme';
import { classesApi, type ClassRoom } from '../../../api/classes.api';
import { studentsApi, type DeviceInfo, type Student } from '../../../api/students.api';
import { useAuthStore } from '../../../store/auth-store';

export default function DetailMuridScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isAdmin = useAuthStore((state) => state.session?.user.isAdmin ?? false);
  const [student, setStudent] = useState<Student | null>(null);
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [fullName, setFullName] = useState('');
  const [classId, setClassId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const detail = (await studentsApi.detail(id)).data;
      setStudent(detail);
      setFullName(detail.fullName);
      setClassId(detail.classId ? String(detail.classId) : null);
      setDevice(await studentsApi.device(id).then((r) => r.data).catch(() => null));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat murid');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    classesApi
      .list()
      .then((result) => setClasses(result.data))
      .catch(() => {});
  }, []);

  const save = async () => {
    if (!id || !student) return;
    setPending(true);
    try {
      await studentsApi.update(id, {
        fullName: fullName.trim(),
        classId: classId ? Number(classId) : undefined,
      });
      await load();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setPending(false);
    }
  };

  const confirmResetDevice = () => {
    Alert.alert('Reset Perangkat', 'Binding perangkat murid akan dihapus. Murid harus login ulang di HP baru untuk bind otomatis.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await studentsApi.resetDevice(id!);
              await load();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Gagal reset perangkat');
            }
          })();
        },
      },
    ]);
  };

  const confirmDeactivate = () => {
    Alert.alert('Nonaktifkan Murid', 'Murid tidak akan bisa login dan hilang dari daftar aktif. Riwayat absensi tetap tersimpan.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Nonaktifkan',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await studentsApi.deactivate(id!);
              router.back();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Gagal menonaktifkan');
            }
          })();
        },
      },
    ]);
  };

  if (!student) {
    return (
      <View style={styles.container}>
        <Text style={styles.meta}>{error ?? 'Memuat...'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.backgroundAlt }} contentContainerStyle={styles.container}>
      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{student.fullName.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{student.fullName}</Text>
          <Text style={styles.meta}>NIS {student.nis}</Text>
          <Text style={styles.meta}>{student.email}</Text>
          <View style={{ marginTop: spacing.xs }}>
            <Badge label={student.className ?? 'Belum punya kelas'} tone={student.className ? 'success' : 'warning'} />
          </View>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Perangkat</Text>
        {device ? (
          <>
            <Text style={styles.meta}>Model: {device.model ?? device.platform ?? 'Tidak diketahui'}</Text>
            <Text style={styles.meta} numberOfLines={1}>Agent: {device.userAgent}</Text>
            <Text style={styles.meta}>Reset count: {device.resetCount}</Text>
            <Button label="Reset Perangkat" onPress={confirmResetDevice} variant="danger-outline" />
          </>
        ) : (
          <Text style={styles.meta}>Belum ada perangkat terdaftar</Text>
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Edit Data</Text>
        <Input label="Nama Lengkap" onChangeText={setFullName} value={fullName} />
        <Select
          label="Kelas"
          onSelect={(value) => setClassId(value)}
          options={[{ label: 'Tanpa Kelas', value: '' }, ...classes.map((c) => ({ label: c.name, value: String(c.id) }))]}
          value={classId ?? ''}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Simpan Perubahan" onPress={save} pending={pending} />
      </Card>

      {isAdmin ? <Button label="Nonaktifkan Murid" onPress={confirmDeactivate} variant="danger-outline" /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.backgroundAlt, gap: spacing.md, padding: spacing.md },
  profileCard: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primary700,
    borderRadius: 999,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  avatarText: { color: colors.textInverse, fontSize: 24, fontWeight: '800' },
  profileInfo: { flex: 1, gap: 2 },
  name: { ...type.heading, color: colors.primary900 },
  sectionTitle: { ...type.label, color: colors.textSecondary, marginBottom: spacing.xs, textTransform: 'uppercase' },
  meta: { ...type.caption, color: colors.textSecondary },
  error: { color: colors.danger, fontSize: type.caption.fontSize },
});
