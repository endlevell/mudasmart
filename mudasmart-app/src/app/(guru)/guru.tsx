import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Card } from '../../components/ui/card';
import { EmptyState } from '../../components/ui/empty-state';
import { PressableScale } from '../../components/ui/pressable-scale';
import { ScreenHeader } from '../../components/ui/screen-header';
import { colors, gradients, radius, shadow, spacing, type } from '../../constants/theme';
import { gurusApi, type GuruRow } from '../../api/gurus.api';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/auth-store';

const initials = (fullName: string) =>
  fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');

// Avatar inisial: gradien untuk admin, netral untuk guru biasa.
function Avatar({ fullName, isAdmin, isActive }: { fullName: string; isAdmin: boolean; isActive: boolean }) {
  const gradient = isAdmin && isActive;
  const textColor = isActive ? (isAdmin ? colors.info : colors.primary700) : colors.textSecondary;
  const label = <Text style={[styles.avatarText, !gradient && { color: textColor }]}>{initials(fullName)}</Text>;
  if (gradient) {
    return (
      <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
        {label}
      </LinearGradient>
    );
  }
  return <View style={[styles.avatar, isAdmin ? styles.avatarInfo : styles.avatarPlain, !isActive && styles.avatarOff]}>{label}</View>;
}

const actionTones = {
  info: { bg: colors.infoBg, fg: colors.info },
  neutral: { bg: colors.surfaceMuted, fg: colors.textSecondary },
  danger: { bg: colors.dangerBg, fg: colors.danger },
};

function RolePill({ isAdmin }: { isAdmin: boolean }) {
  return (
    <View style={[styles.pill, { backgroundColor: isAdmin ? colors.infoBg : colors.surfaceMuted }]}>
      <Ionicons name={isAdmin ? 'shield-checkmark' : 'person'} size={11} color={isAdmin ? colors.info : colors.textSecondary} />
      <Text style={[styles.pillText, { color: isAdmin ? colors.info : colors.textSecondary }]}>{isAdmin ? 'Admin' : 'Guru'}</Text>
    </View>
  );
}

// Status pill hanya tampil saat nonaktif — status aktif sudah terlihat dari dot avatar.
function StatusPill() {
  return (
    <View style={[styles.pill, { backgroundColor: colors.dangerBg }]}>
      <View style={[styles.pillDot, { backgroundColor: colors.danger }]} />
      <Text style={[styles.pillText, { color: colors.danger }]}>Nonaktif</Text>
    </View>
  );
}

// Tombol aksi pill — pengganti teks polos.
function PillAction({ label, tone, onPress }: { label: string; tone: keyof typeof actionTones; onPress: () => void }) {
  const palette = actionTones[tone];
  return (
    <PressableScale onPress={onPress} style={{ flex: 1 }}>
      <View style={[styles.actionPill, { backgroundColor: palette.bg }]}>
        <Text style={[styles.actionPillText, { color: palette.fg }]}>{label}</Text>
      </View>
    </PressableScale>
  );
}

function MiniStat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatValue}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

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

  const confirmResetPassword = (guru: GuruRow) => {
    Alert.alert('Reset Kata Sandi', `Kata sandi ${guru.fullName} akan diganti dengan sandi sementara baru.`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Reset',
        onPress: () => {
          void (async () => {
            try {
              const { temporaryPassword } = await authApi.adminResetPassword(guru.id);
              Alert.alert('Kata Sandi Sementara', `Bagikan kepada ${guru.fullName}:\n\n${temporaryPassword}\n\nSandi ini hanya ditampilkan sekali.`);
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Gagal reset kata sandi');
            }
          })();
        },
      },
    ]);
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
        {gurus.length > 0 ? (
          <View style={styles.statsRow}>
            <MiniStat value={gurus.length} label="Total" />
            <MiniStat value={gurus.filter((guru) => guru.isAdmin).length} label="Admin" />
            <MiniStat value={gurus.filter((guru) => !guru.isActive).length} label="Nonaktif" />
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {gurus.map((guru, index) => (
          <Animated.View key={guru.id} entering={FadeInDown.delay(index * 50)}>
            <Card>
              <View style={styles.row}>
                <View style={styles.avatarWrap}>
                  <Avatar fullName={guru.fullName} isAdmin={guru.isAdmin} isActive={guru.isActive} />
                  <View style={[styles.statusDot, { backgroundColor: guru.isActive ? colors.primary500 : colors.danger }]} />
                </View>
                <View style={styles.info}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>
                      {guru.fullName}
                    </Text>
                    {guru.id === myId ? (
                      <View style={styles.youTag}>
                        <Text style={styles.youTagText}>Anda</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.emailRow}>
                    <Ionicons name="mail-outline" size={13} color={colors.textSecondary} />
                    <Text style={styles.meta} numberOfLines={1}>
                      {guru.email}
                    </Text>
                  </View>
                  <View style={styles.badges}>
                    <RolePill isAdmin={guru.isAdmin} />
                    {!guru.isActive ? <StatusPill /> : null}
                  </View>
                </View>
              </View>
              {guru.id !== myId && guru.isActive ? (
                <>
                  <View style={styles.divider} />
                  <View style={styles.actions}>
                    <PillAction
                      label={guru.isAdmin ? 'Cabut Admin' : 'Jadikan Admin'}
                      tone={guru.isAdmin ? 'neutral' : 'info'}
                      onPress={() => confirmToggleAdmin(guru)}
                    />
                    <PillAction label="Reset Sandi" tone="neutral" onPress={() => confirmResetPassword(guru)} />
                    <PillAction label="Nonaktifkan" tone="danger" onPress={() => confirmDeactivate(guru)} />
                  </View>
                </>
              ) : null}
            </Card>
          </Animated.View>
        ))}

        {gurus.length === 0 ? <EmptyState title="Belum ada guru" message="Guru mendaftar lewat kode registrasi guru." /> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.backgroundAlt, flex: 1 },
  content: { padding: spacing.md, gap: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  miniStat: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...shadow.card,
  },
  miniStatValue: { fontSize: type.title.fontSize, fontWeight: '800', color: colors.primary700 },
  miniStatLabel: { ...type.caption, color: colors.textSecondary },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  avatarWrap: { position: 'relative' },
  statusDot: {
    borderColor: colors.background,
    borderRadius: radius.full,
    borderWidth: 2,
    bottom: -1,
    height: 14,
    position: 'absolute',
    right: -1,
    width: 14,
  },
  avatar: { alignItems: 'center', borderRadius: radius.full, height: 48, justifyContent: 'center', width: 48 },
  avatarText: { fontSize: 16, fontWeight: '800', color: colors.textInverse, letterSpacing: 0.5 },
  avatarInfo: { backgroundColor: colors.infoBg },
  avatarPlain: { backgroundColor: colors.primary100 },
  avatarOff: { backgroundColor: colors.surfaceMuted, opacity: 0.75 },
  info: { flex: 1, gap: 2 },
  nameRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  name: { ...type.bodyStrong, color: colors.textPrimary, flexShrink: 1 },
  youTag: { backgroundColor: colors.primary100, borderRadius: radius.full, paddingHorizontal: 7, paddingVertical: 2 },
  youTagText: { fontSize: 10, fontWeight: '800', color: colors.primary700 },
  meta: { ...type.caption, color: colors.textSecondary, flexShrink: 1 },
  emailRow: { alignItems: 'center', flexDirection: 'row', gap: 5, marginTop: 1 },
  badges: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  pill: { alignItems: 'center', borderRadius: radius.full, flexDirection: 'row', gap: 4, paddingHorizontal: 9, paddingVertical: 4 },
  pillDot: { borderRadius: radius.full, height: 6, width: 6 },
  pillText: { fontSize: 11, fontWeight: '700' },
  divider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginTop: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm + 2 },
  actionPill: { alignItems: 'center', borderRadius: radius.full, paddingVertical: 9 },
  actionPillText: { fontSize: type.caption.fontSize, fontWeight: '700' },
  error: { color: colors.danger, fontSize: type.caption.fontSize },
});
