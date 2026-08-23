import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { colors, radius, spacing, type } from '../../constants/theme';
import { useAuthStore } from '../../store/auth-store';
import { fieldErrors, registerSchema } from '../../utils/validation';

const initial = { fullName: '', email: '', password: '', confirmPassword: '', registrationCode: '', nis: '' };

export default function RegisterScreen() {
  const { register, pending, error } = useAuthStore();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (key: keyof typeof initial) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    try {
      // confirmPassword hanya untuk validasi sisi client — jangan dikirim ke server (.strict() akan menolak).
      const { confirmPassword: _ignored, ...payload } = parsed.data;
      await register(payload);
      // Redirect ditangani root layout berdasarkan role hasil registrasi.
      router.replace('/(murid)');
    } catch {
      // error sudah disimpan di store.
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" bounces={false}>
        <LinearGradient colors={['#073D2C', '#0B6E4F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.orbOne} />
          <Text style={styles.title}>Buat Akun</Text>
          <Text style={styles.tagline}>Gunakan kode sekolah yang diberikan admin</Text>
        </LinearGradient>

        <View style={styles.sheet}>
          <Input label="Nama Lengkap" onChangeText={update('fullName')} value={form.fullName} error={errors.fullName} />
          <Input
            autoCapitalize="none"
            keyboardType="email-address"
            label="Email"
            onChangeText={update('email')}
            placeholder="nama@email.com"
            value={form.email}
            error={errors.email}
          />
          <Input label="Kata Sandi" onChangeText={update('password')} secureTextEntry value={form.password} error={errors.password} hint="Minimal 8 karakter" />
          <Input
            label="Konfirmasi Kata Sandi"
            onChangeText={update('confirmPassword')}
            secureTextEntry
            value={form.confirmPassword}
            error={errors.confirmPassword}
          />
          <Input label="NIS" onChangeText={update('nis')} value={form.nis} error={errors.nis} placeholder="Nomor Induk Siswa" />
          <Input label="Kode Sekolah" onChangeText={update('registrationCode')} value={form.registrationCode} error={errors.registrationCode} />

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button
            disabled={!form.email || !form.password || !form.fullName || !form.registrationCode}
            label="Daftar"
            onPress={submit}
            pending={pending}
          />

          <Link href="/(auth)/login" style={styles.link}>
            Sudah punya akun? <Text style={styles.linkStrong}>Masuk</Text>
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
    paddingBottom: spacing.xl + 32,
    paddingTop: spacing.xxl + 16,
    overflow: 'hidden',
  },
  orbOne: {
    backgroundColor: 'rgba(111,203,163,0.18)',
    borderRadius: 999,
    height: 200,
    left: -70,
    position: 'absolute',
    top: -60,
    width: 200,
  },
  title: { ...type.display, color: colors.textInverse },
  tagline: { ...type.body, color: 'rgba(255,255,255,0.8)', marginTop: spacing.xs },
  sheet: {
    backgroundColor: colors.backgroundAlt,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    marginTop: -radius.xl,
    padding: spacing.xl,
  },
  errorBox: { backgroundColor: colors.dangerBg, borderRadius: radius.md, marginBottom: spacing.md, padding: spacing.md },
  errorText: { color: colors.danger, fontSize: type.caption.fontSize + 1, fontWeight: '600' },
  link: { alignSelf: 'stretch', color: colors.textSecondary, marginTop: spacing.lg, textAlign: 'center' },
  linkStrong: { color: colors.primary700, fontWeight: '700' },
});
