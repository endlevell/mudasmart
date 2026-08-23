import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { colors, radius, spacing, type } from '../../constants/theme';
import { useAuthStore } from '../../store/auth-store';

// Profil /me — identitas + menu per role.
export default function GuruProfilScreen() {
  const { session: auth, logout } = useAuthStore();
  const user = auth?.user;
  const initials = (user?.fullName ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <LinearGradient colors={gradientsSafe} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user?.fullName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={{ marginTop: spacing.sm }}>
          <Badge label={user?.isAdmin ? 'Guru Admin' : 'Guru'} tone="info" />
        </View>
      </LinearGradient>

      <Card style={styles.menuCard}>
        <MenuItem label="Kelola Kelas" sub="Daftar kelas & wali kelas" onPress={() => router.push('/(guru)/kelas')} />
        {user?.isAdmin ? (
          <>
            <Divider />
            <MenuItem label="Kelola Gerbang" sub="QR gerbang & geofence" onPress={() => router.push('/(guru)/gerbang')} />
            <Divider />
            <MenuItem label="Pengaturan" sub="Jam absen & kode registrasi" onPress={() => router.push('/(guru)/pengaturan')} />
          </>
        ) : null}
      </Card>

      <Button label="Keluar" onPress={() => void logout()} variant="ghost" />
    </ScrollView>
  );
}

function MenuItem({ label, sub, onPress }: { label: string; sub: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      <View>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const Divider = () => <View style={styles.divider} />;

// LinearGradient butuh mutable array; token readonly → salin.
const gradientsSafe = ['#073D2C', '#0B6E4F'] as const;

const styles = StyleSheet.create({
  container: { backgroundColor: colors.backgroundAlt, gap: spacing.md, paddingBottom: spacing.xxl },
  hero: {
    alignItems: 'center',
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    gap: spacing.xs,
    paddingBottom: spacing.xl,
    paddingTop: spacing.xxl,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 999,
    borderWidth: 2,
    height: 76,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 76,
  },
  avatarText: { color: colors.textInverse, fontSize: 28, fontWeight: '800' },
  name: { ...type.title, color: colors.textInverse },
  email: { ...type.caption, color: 'rgba(255,255,255,0.75)' },
  menuCard: { paddingVertical: spacing.xs },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xs, paddingVertical: spacing.sm },
  rowLabel: { ...type.bodyStrong, color: colors.textPrimary },
  rowSub: { ...type.caption, color: colors.textSecondary },
  divider: { backgroundColor: colors.border, height: 1 },
  chevron: { color: colors.primary500, fontSize: 26, fontWeight: '700' },
});
