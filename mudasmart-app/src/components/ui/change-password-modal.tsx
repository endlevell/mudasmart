import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './button';
import { Input } from './input';
import { toast } from './toast';
import { colors, spacing, type } from '../../constants/theme';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/auth-store';

// Form ganti kata sandi sendiri. Setelah sukses, sesi lokal diakhiri (server
// mencabut semua refresh token) → root layout mengarahkan ke login.
export function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const logout = useAuthStore((state) => state.logout);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.head}>
          <Text style={styles.title}>Ubah Kata Sandi</Text>
          <Text style={styles.sub}>Setelah diganti, semua sesi lain akan keluar otomatis.</Text>
        </View>
        <Input label="Kata Sandi Saat Ini" onChangeText={setCurrent} secureTextEntry value={current} />
        <Input label="Kata Sandi Baru" onChangeText={setNext} secureTextEntry value={next} hint="Minimal 8 karakter" />
        <Input label="Konfirmasi Kata Sandi Baru" onChangeText={setConfirm} secureTextEntry value={confirm} />
        <Button label="Simpan Kata Sandi" onPress={() => void submit()} pending={submitting} />
        <Pressable onPress={onClose} style={styles.cancel}>
          <Ionicons name="arrow-back" size={15} color={colors.textSecondary} />
          <Text style={styles.cancelText}>Batal</Text>
        </Pressable>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.backgroundAlt, flex: 1 },
  content: { paddingBottom: spacing.xxl, padding: spacing.lg },
  head: { marginBottom: spacing.lg, marginTop: spacing.xl },
  title: { ...type.title, color: colors.textPrimary },
  sub: { ...type.body, color: colors.textSecondary, marginTop: spacing.xs },
  cancel: { alignItems: 'center', flexDirection: 'row', gap: 5, justifyContent: 'center', marginTop: spacing.md, padding: spacing.sm },
  cancelText: { color: colors.textSecondary, fontSize: type.caption.fontSize + 1, fontWeight: '600' },
});
