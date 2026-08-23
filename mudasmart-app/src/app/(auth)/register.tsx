import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from '../../components/ui/toast';
import { colors, radius, shadow, spacing, type } from '../../constants/theme';
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
      toast.show({ tone: 'success', title: 'Akun dibuat', message: 'Selamat bergabung di MUDASmart.' });
      // Redirect ditangani root layout berdasarkan role hasil registrasi.
      router.replace('/(murid)');
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      toast.show({ tone: 'danger', title: 'Gagal mendaftar', message: e instanceof Error ? e.message : 'Terjadi kesalahan' });
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" bounces={false}>
        <LinearGradient colors={['#073D2C', '#0B6E4F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.orbOne} />
          <View style={styles.orbTwo} />
          <View style={styles.brandMark}>
            <Ionicons name="person-add-outline" size={24} color={colors.textInverse} />
          </View>
          <Text style={styles.title}>Buat Akun</Text>
          <Text style={styles.tagline}>Gunakan kode sekolah yang diberikan admin</Text>
        </LinearGradient>

        <View style={[styles.sheet, shadow.floating]}>
          <Text style={styles.sheetTitle}>Lengkapi data kamu</Text>
          <Text style={styles.sheetSub}>Semua kolom bertanda wajib diisi dengan data yang benar.</Text>

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
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button
            disabled={!form.email || !form.password || !form.fullName || !form.registrationCode}
            label="Daftar"
            onPress={submit}
            pending={pending}
          />

          <Link href="/(auth)/login" asChild>
            <Text style={styles.link}>
              Sudah punya akun? <Text style={styles.linkStrong}>Masuk</Text>
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
    paddingTop: spacing.xxl,
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
  orbTwo: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    height: 140,
    position: 'absolute',
    right: -46,
    bottom: -30,
    width: 140,
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    height: 54,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 54,
  },
  title: { ...type.display, color: colors.textInverse },
  tagline: { ...type.body, color: 'rgba(255,255,255,0.8)', marginTop: spacing.xs },
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
