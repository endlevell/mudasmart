import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { colors, radius, spacing, type } from '../../constants/theme';
import { useAuthStore } from '../../store/auth-store';
import { fieldErrors, loginSchema } from '../../utils/validation';

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
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>M</Text>
          </View>
          <Text style={styles.title}>MUDASmart</Text>
          <Text style={styles.tagline}>Absensi SMA Muhammadiyah 2 Tangerang</Text>
        </LinearGradient>

        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Selamat datang kembali</Text>
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
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button disabled={!form.email || !form.password} label="Masuk" onPress={submit} pending={pending} />

          <Link href="/(auth)/register" style={styles.link}>
            Belum punya akun? <Text style={styles.linkStrong}>Daftar</Text>
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
    paddingBottom: spacing.xxl + 32,
    paddingTop: spacing.xxl + 24,
    overflow: 'hidden',
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
    bottom: -40,
    width: 160,
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    height: 56,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 56,
  },
  brandMarkText: { color: colors.textInverse, fontSize: 26, fontWeight: '800' },
  title: { ...type.display, color: colors.textInverse },
  tagline: { ...type.body, color: 'rgba(255,255,255,0.8)', marginTop: spacing.xs },
  sheet: {
    backgroundColor: colors.backgroundAlt,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    marginTop: -radius.xl,
    padding: spacing.xl,
  },
  sheetTitle: { ...type.heading, color: colors.textPrimary, marginBottom: spacing.lg },
  errorBox: { backgroundColor: colors.dangerBg, borderRadius: radius.md, marginBottom: spacing.md, padding: spacing.md },
  errorText: { color: colors.danger, fontSize: type.caption.fontSize + 1, fontWeight: '600' },
  link: { alignSelf: 'stretch', color: colors.textSecondary, marginTop: spacing.lg, textAlign: 'center' },
  linkStrong: { color: colors.primary700, fontWeight: '700' },
});
