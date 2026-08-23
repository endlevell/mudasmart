import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './button';
import { Input } from './input';
import { toast } from './toast';
import { colors, radius, shadow, spacing, type } from '../../constants/theme';
import { authApi } from '../../api/auth.api';
import { clearCredentials } from '../../utils/secure-storage';
import { useAuthStore } from '../../store/auth-store';

// Bottom-sheet ganti kata sandi — desain senada dengan modal ajukan izin.
// Setelah sukses, server mencabut semua sesi refresh → sesi lokal diakhiri
// dan root layout mengarahkan ke login.
export function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const logout = useAuthStore((state) => state.logout);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const close = () => {
    if (submitting) return;
    onClose();
  };

  const submit = async () => {
    if (next.length < 8) {
      toast.show({ tone: 'warning', title: 'Kata sandi terlalu pendek', message: 'Minimal 8 karakter.' });
      return;
    }
    if (next !== confirm) {
      toast.show({ tone: 'warning', title: 'Konfirmasi tidak sama', message: 'Periksa ulang kata sandi baru.' });
      return;
    }
    setSubmitting(true);
    try {
      await authApi.changePassword({ currentPassword: current, newPassword: next });
      // Kredensial tersimpan tidak berlaku lagi — buang agar auto-relogin tidak
      // memakai sandi lama; disimpan ulang otomatis saat login berikutnya.
      await clearCredentials();
      toast.show({ tone: 'success', title: 'Kata sandi diganti', message: 'Silakan masuk kembali dengan kata sandi baru.' });
      onClose();
      setTimeout(() => void logout(), 600);
    } catch (e) {
      toast.show({ tone: 'danger', title: 'Gagal mengganti', message: e instanceof Error ? e.message : 'Terjadi kesalahan' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={close} transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouch} onPress={close} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <View style={styles.head}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Ubah Kata Sandi</Text>
                <Text style={styles.sub}>Semua sesi lain akan keluar otomatis setelah diganti.</Text>
              </View>
              <Pressable onPress={close} hitSlop={8} style={styles.closeButton}>
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView bounces={false} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Input label="Kata Sandi Saat Ini" onChangeText={setCurrent} secureTextEntry value={current} />
              <Input label="Kata Sandi Baru" onChangeText={setNext} secureTextEntry value={next} hint="Minimal 8 karakter" />
              <Input label="Konfirmasi Kata Sandi Baru" onChangeText={setConfirm} secureTextEntry value={confirm} />
              <Button label="Simpan Kata Sandi" onPress={() => void submit()} pending={submitting} />
              <Text style={styles.note}>Gunakan kata sandi yang kuat dan jangan bagikan ke siapa pun.</Text>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(7,18,14,0.6)', flex: 1 },
  backdropTouch: { flex: 1 },
  sheetWrap: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    height: '72%',
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    ...shadow.floating,
  },
  grabber: { alignSelf: 'center', backgroundColor: colors.borderStrong, borderRadius: radius.full, height: 4, marginBottom: spacing.sm, width: 44 },
  head: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  title: { ...type.title, color: colors.textPrimary },
  sub: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  closeButton: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.full, height: 32, justifyContent: 'center', width: 32 },
  note: { ...type.caption, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' },
});
