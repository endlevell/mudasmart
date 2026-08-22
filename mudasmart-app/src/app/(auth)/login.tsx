import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { colors, radius, shadow, spacing, type } from '../../constants/theme';
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
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>M</Text>
          </View>
          <Text style={styles.title}>MUDASmart</Text>
        </View>
        <Text style={styles.subtitle}>Absensi SMA Muhammadiyah 2 Tangerang</Text>

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
  brandRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, justifyContent: 'center' },
  brandMark: {
    alignItems: 'center',
    backgroundColor: colors.primary700,
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
    ...shadow.card,
  },
  brandMarkText: { color: colors.textInverse, fontSize: 22, fontWeight: '800' },
  title: { ...type.display, color: colors.primary900 },
  subtitle: { ...type.body, color: colors.textSecondary, marginBottom: spacing.xl, marginTop: spacing.sm, textAlign: 'center' },
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
