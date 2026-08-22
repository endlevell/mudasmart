import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { colors, radius, spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';
import { fieldErrors, loginSchema } from '@/utils/validation';

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
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>MUDASmart</Text>
        <Text style={styles.subtitle}>SMA Muhammadiyah 2 Tangerang</Text>

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
          Belum punya akun? Daftar
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
    padding: spacing.lg,
  },
  title: { color: colors.primary700, fontSize: 32, fontWeight: '700', textAlign: 'center' },
  subtitle: { color: colors.textSecondary, fontSize: 14, marginBottom: spacing.xl, textAlign: 'center' },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: colors.danger,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  errorText: { color: colors.danger, fontSize: 14 },
  link: { color: colors.info, marginTop: spacing.lg, textAlign: 'center' },
});
