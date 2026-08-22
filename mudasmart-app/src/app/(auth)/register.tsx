import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
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
      await register(parsed.data);
      // Redirect ditangani root layout berdasarkan role hasil registrasi.
      router.replace('/(murid)');
    } catch {
      // error sudah disimpan di store.
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Buat Akun</Text>
        <Text style={styles.subtitle}>Gunakan kode sekolah yang diberikan admin</Text>

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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.backgroundAlt },
  container: {
    backgroundColor: colors.backgroundAlt,
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: { ...type.display, color: colors.primary900 },
  subtitle: { ...type.body, color: colors.textSecondary, marginBottom: spacing.lg, marginTop: spacing.sm },
  errorBox: {
    backgroundColor: colors.dangerBg,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  errorText: { color: colors.danger, fontSize: type.caption.fontSize + 1, fontWeight: '600' },
  link: { alignSelf: 'center', color: colors.textSecondary, marginTop: spacing.lg },
  linkStrong: { color: colors.primary700, fontWeight: '700' },
});
