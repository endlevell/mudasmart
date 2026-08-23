import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { EmptyState } from '../../components/ui/empty-state';
import { ScreenHeader } from '../../components/ui/screen-header';
import { colors, spacing, type } from '../../constants/theme';
import { gurusApi, type GuruRow } from '../../api/gurus.api';
import { useAuthStore } from '../../store/auth-store';

// Kelola Guru (admin) — jadikan admin, cabut admin, nonaktifkan.
export default function KelolaGuruScreen() {
  const myId = useAuthStore((state) => state.session?.user.id);
  const [gurus, setGurus] = useState<GuruRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setGurus((await gurusApi.list()).data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat guru');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmToggleAdmin = (guru: GuruRow) => {
    Alert.alert(
      guru.isAdmin ? 'Cabut Admin' : 'Jadikan Admin',
      guru.isAdmin ? `${guru.fullName} akan kehilangan akses admin.` : `${guru.fullName} akan bisa mengelola kelas, gerbang, kode, dan guru lain.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: guru.isAdmin ? 'Cabut' : 'Jadikan',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await gurusApi.setAdmin(guru.id, !guru.isAdmin);
                await load();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Gagal mengubah role');
              }
            })();
          },
        },
      ],
    );
  };

  const confirmDeactivate = (guru: GuruRow) => {
    Alert.alert('Nonaktifkan Guru', `${guru.fullName} tidak akan bisa login lagi.`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Nonaktifkan',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await gurusApi.deactivate(guru.id);
              await load();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Gagal menonaktifkan');
            }
          })();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Kelola Guru" subtitle="Role admin & status akun" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 140 }]}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {gurus.map((guru) => (
          <Card key={guru.id}>
            <View style={styles.row}>
              <View style={styles.info}>
                <Text style={styles.name}>{guru.fullName}{guru.id === myId ? ' (kamu)' : ''}</Text>
                <Text style={styles.meta}>{guru.email}</Text>
                <View style={styles.badges}>
                  <Badge label={guru.isAdmin ? 'Admin' : 'Guru'} tone={guru.isAdmin ? 'info' : 'neutral'} />
                  {!guru.isActive ? <Badge label="Nonaktif" tone="danger" /> : null}
                </View>
              </View>
            </View>
            {guru.id !== myId && guru.isActive ? (
              <View style={styles.actions}>
                <PressableText
                  label={guru.isAdmin ? 'Cabut Admin' : 'Jadikan Admin'}
                  color={colors.info}
                  onPress={() => confirmToggleAdmin(guru)}
                />
                <PressableText label="Nonaktifkan" color={colors.danger} onPress={() => confirmDeactivate(guru)} />
              </View>
            ) : null}
          </Card>
        ))}
        {gurus.length === 0 ? <EmptyState title="Belum ada guru" message="Guru mendaftar lewat kode registrasi guru." /> : null}
      </ScrollView>
    </View>
  );
}

function PressableText({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <Text accessibilityRole="button" onPress={onPress} style={[styles.actionText, { color }]}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.backgroundAlt, flex: 1 },
  content: { padding: spacing.md, gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  info: { flex: 1, gap: 2 },
  name: { ...type.bodyStrong, color: colors.textPrimary },
  meta: { ...type.caption, color: colors.textSecondary },
  badges: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  actions: { alignItems: 'flex-end', gap: spacing.sm },
  actionText: { fontSize: type.caption.fontSize, fontWeight: '700' },
  error: { color: colors.danger, fontSize: type.caption.fontSize },
});
