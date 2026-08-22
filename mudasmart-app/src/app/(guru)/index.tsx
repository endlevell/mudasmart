import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { colors, radius, spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';

// Placeholder Fase 1-2 — dashboard guru (kontrol sesi) dibangun di Fase 3.
export default function GuruDashboard() {
  const { session, logout } = useAuthStore();
  const user = session?.user;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.greeting}>Halo, {user?.fullName}</Text>
        <Text style={styles.meta}>{user?.email}</Text>
        <Text style={styles.badge}>{user?.isAdmin ? 'Guru Admin' : 'Guru'}</Text>
      </View>
      <Button label="Kelola Murid" onPress={() => router.push('/(guru)/murid')} />
      <Button label="Kelola Kelas" onPress={() => router.push('/(guru)/kelas')} />
      <Button label="Keluar" onPress={() => void logout()} variant="danger-outline" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundAlt,
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  greeting: { color: colors.textPrimary, fontSize: 20, fontWeight: '700' },
  meta: { color: colors.textSecondary, fontSize: 14 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary100,
    borderRadius: radius.md,
    color: colors.primary700,
    fontSize: 12,
    fontWeight: '600',
    marginTop: spacing.sm,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
