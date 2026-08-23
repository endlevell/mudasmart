import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { colors, radius, shadow, spacing, type } from '../../constants/theme';
import { useAuthStore } from '../../store/auth-store';
import { fieldErrors, loginSchema } from '../../utils/validation';

const features = [
  { icon: 'qr-code-outline' as const, label: 'Scan QR Gerbang' },
  { icon: 'stats-chart-outline' as const, label: 'Rekap Otomatis' },
  { icon: 'document-text-outline' as const, label: 'Export Excel' },
];

export default function LoginScreen() {
  const { login, pending, error } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = async () => {
    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    try {
      await login(parsed.data);
    } catch {
      // error sudah disimpan di store; ditampilkan di bawah.
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" bounces={false}>
        <LinearGradient colors={['#073D2C', '#0B6E4F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.orbOne} />
          <View style={styles.orbTwo} />
          <View style={styles.orbThree} />
          <View style={styles.brandMark}>
            <Ionicons name="scan" size={26} color={colors.textInverse} />
          </View>
          <Text style={styles.title}>MUDASmart</Text>
          <Text style={styles.tagline}>Absensi SMA Muhammadiyah 2 Tangerang</Text>
          <View style={styles.featureRow}>
            {features.map((feature) => (
              <View key={feature.label} style={styles.featurePill}>
                <Ionicons name={feature.icon} size={12} color={colors.primary300} />
                <Text style={styles.featureText}>{feature.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={[styles.sheet, shadow.floating]}>
          <Text style={styles.sheetTitle}>Selamat datang kembali</Text>
          <Text style={styles.sheetSub}>Masuk untuk melanjutkan absensi hari ini.</Text>
          <Input
            autoCapitalize="none"
            keyboardType="email-address"
            label="Email"
            onChangeText={(email) => setForm((prev) => ({ ...prev, email }))}
            placeholder="nama@email.com"
            value={form.email}
            error={errors.email}
          />
          <Input
            label="Kata Sandi"
            onChangeText={(password) => setForm((prev) => ({ ...prev, password }))}
            secureTextEntry
            value={form.password}
            error={errors.password}
          />

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button disabled={!form.email || !form.password} label="Masuk" onPress={submit} pending={pending} />

          <Link href="/(auth)/register" asChild>
            <Text style={styles.link}>
              Belum punya akun? <Text style={styles.linkStrong}>Daftar sekarang</Text>
            </Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.backgroundAlt },
  container: { flexGrow: 1 },
  hero: {
    alignItems: 'center',
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    overflow: 'hidden',
    paddingBottom: spacing.xl + 40,
    paddingTop: spacing.xxl + 24,
  },
  orbOne: {
    backgroundColor: 'rgba(111,203,163,0.18)',
    borderRadius: 999,
    height: 220,
    left: -60,
    position: 'absolute',
    top: -70,
    width: 220,
  },
  orbTwo: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    height: 160,
    position: 'absolute',
    right: -50,
    bottom: -20,
    width: 160,
  },
  orbThree: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 999,
    height: 90,
    left: 30,
    position: 'absolute',
    top: 110,
    width: 90,
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    height: 58,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 58,
  },
  title: { ...type.display, color: colors.textInverse },
  tagline: { ...type.body, color: 'rgba(255,255,255,0.8)', marginTop: spacing.xs },
  featureRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center', marginTop: spacing.lg },
  featurePill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  featureText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    marginHorizontal: spacing.sm,
    marginTop: -radius.xl,
    padding: spacing.xl,
  },
  sheetTitle: { ...type.title, color: colors.textPrimary },
  sheetSub: { ...type.body, color: colors.textSecondary, marginBottom: spacing.lg, marginTop: spacing.xs },
  errorBox: { alignItems: 'center', backgroundColor: colors.dangerBg, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, padding: spacing.md },
  errorText: { color: colors.danger, flex: 1, fontSize: type.caption.fontSize + 1, fontWeight: '600' },
  link: { alignSelf: 'stretch', color: colors.textSecondary, marginTop: spacing.lg, textAlign: 'center' },
  linkStrong: { color: colors.primary700, fontWeight: '700' },
});
