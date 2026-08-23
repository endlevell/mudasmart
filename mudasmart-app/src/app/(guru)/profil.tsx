import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { ChangePasswordModal } from '../../components/ui/change-password-modal';
import { PressableScale } from '../../components/ui/pressable-scale';
import { colors, radius, spacing, type } from '../../constants/theme';
import { useAuthStore } from '../../store/auth-store';

const initialsOf = (fullName: string) =>
  fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

// Profil guru — identitas, detail akun, dan menu per role.
export default function GuruProfilScreen() {
  const insets = useSafeAreaInsets();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const { session: auth, logout } = useAuthStore();
  const user = auth?.user;
  const isAdmin = !!user?.isAdmin;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
      <LinearGradient colors={['#073D2C', '#0B6E4F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}>
        <View style={[styles.orb, styles.orbLarge]} />
        <View style={[styles.orb, styles.orbSmall]} />
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsOf(user?.fullName ?? '?')}</Text>
        </View>
        <Text style={styles.name}>{user?.fullName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.rolePill}>
          <Ionicons name="shield-checkmark" size={12} color={colors.textInverse} />
          <Text style={styles.rolePillText}>{isAdmin ? 'Guru Admin' : 'Guru'}</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <Animated.View entering={FadeInDown.delay(40)}>
          <Card>
            <Text style={styles.cardTitle}>Informasi Akun</Text>
            <View style={{ marginTop: spacing.sm }}>
              <InfoRow icon="person-outline" label="Nama Lengkap" value={user?.fullName ?? '-'} />
              <InfoRow icon="mail-outline" label="Email" value={user?.email ?? '-'} />
              <InfoRow icon="school-outline" label="Role" value={isAdmin ? 'Guru Admin' : 'Guru'} />
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(90)}>
          <Card>
            <Text style={styles.cardTitle}>Menu</Text>
            <View style={{ marginTop: spacing.xs }}>
              <MenuItem
                icon="school-outline"
                label="Kelola Kelas"
                sub="Daftar kelas & wali kelas"
                onPress={() => router.push('/(guru)/kelas')}
              />
              {isAdmin ? (
                <>
                  <MenuItem
                    icon="qr-code-outline"
                    label="Kelola Gerbang"
                    sub="QR gerbang & geofence"
                    onPress={() => router.push('/(guru)/gerbang')}
                  />
                  <MenuItem
                    icon="settings-outline"
                    label="Pengaturan"
                    sub="Jam absen & kode registrasi"
                    onPress={() => router.push('/(guru)/pengaturan')}
                  />
                </>
              ) : null}
              <MenuItem
                icon="lock-closed-outline"
                label="Ubah Kata Sandi"
                sub="Ganti kata sandi akun"
                onPress={() => setPasswordOpen(true)}
              />
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140)}>
          <Button variant="danger-outline" label="Keluar" onPress={() => void logout()} />
        </Animated.View>

        <Text style={styles.version}>MUDASmart · Aplikasi Absensi QR</Text>
      </View>

      <ChangePasswordModal onClose={() => setPasswordOpen(false)} visible={passwordOpen} />
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: Extract<keyof typeof Ionicons.glyphMap, string>; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={16} color={colors.primary700} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.infoValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function MenuItem({ icon, label, sub, onPress }: { icon: Extract<keyof typeof Ionicons.glyphMap, string>; label: string; sub: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} style={styles.menuItem}>
      <View style={[styles.rowIcon, { backgroundColor: colors.primary50 }]}>
        <Ionicons name={icon} size={17} color={colors.primary700} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.menuLabel}>{label}</Text>
        <Text style={styles.menuSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.primary500} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.backgroundAlt, flex: 1 },
  hero: {
    alignItems: 'center',
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    overflow: 'hidden',
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  orb: { borderRadius: radius.full, position: 'absolute' },
  orbLarge: { backgroundColor: 'rgba(111,203,163,0.16)', height: 160, right: -46, top: -40, width: 160 },
  orbSmall: { backgroundColor: 'rgba(255,255,255,0.07)', bottom: -38, height: 110, left: -30, width: 110 },
  avatar: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: radius.full,
    borderWidth: 2,
    height: 84,
    justifyContent: 'center',
    marginBottom: spacing.sm,
    width: 84,
  },
  avatarText: { color: colors.textInverse, fontSize: 30, fontWeight: '800', letterSpacing: 1 },
  name: { ...type.title, color: colors.textInverse, marginTop: 2 },
  email: { ...type.caption, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
  rolePill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.full,
    flexDirection: 'row',
    gap: 5,
    marginTop: spacing.sm + 2,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  rolePillText: { fontSize: 12, fontWeight: '700', color: colors.textInverse },
  content: { gap: spacing.md, padding: spacing.md },
  cardTitle: { ...type.heading, color: colors.textPrimary },
  infoRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm + 2, paddingVertical: spacing.sm - 2 },
  rowIcon: { alignItems: 'center', backgroundColor: colors.primary100, borderRadius: 10, height: 34, justifyContent: 'center', width: 34 },
  infoLabel: { ...type.caption, color: colors.textSecondary },
  infoValue: { ...type.bodyStrong, color: colors.textPrimary, marginTop: 1 },
  menuItem: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm + 2, paddingVertical: spacing.sm },
  menuLabel: { ...type.bodyStrong, color: colors.textPrimary },
  menuSub: { ...type.caption, color: colors.textSecondary, marginTop: 1 },
  version: { ...type.caption, color: colors.textSecondary, textAlign: 'center' },
});
