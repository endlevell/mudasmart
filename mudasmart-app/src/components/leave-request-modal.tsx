import { useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { PressableScale } from './ui/pressable-scale';
import { toast } from './ui/toast';
import { colors, radius, shadow, spacing, type } from '../constants/theme';
import { leavesApi } from '../api/leaves.api';

const jakarta = 'Asia/Jakarta';

const dayOptions = () => {
  const now = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - index);
    return {
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      weekday: new Intl.DateTimeFormat('id-ID', { timeZone: jakarta, weekday: 'short' }).format(date),
      dayNumber: date.getDate(),
      isToday: index === 0,
    };
  });
};

const types = [
  { value: 'sakit' as const, label: 'Sakit', icon: 'thermometer' as const },
  { value: 'izin' as const, label: 'Izin', icon: 'document-text-outline' as const },
];

// Bottom-sheet pengajuan izin/sakit murid — dipasang di layar profil.
export function LeaveRequestModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [dateValue, setDateValue] = useState(dayOptions()[0].value);
  const [type, setType] = useState<'sakit' | 'izin'>('sakit');
  const [reason, setReason] = useState('');
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const close = () => {
    if (submitting) return;
    onClose();
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, allowsMultipleSelection: false });
    if (!result.canceled && result.assets[0]) setImage(result.assets[0]);
  };

  const submit = async () => {
    if (reason.trim().length < 3) {
      toast.show({ tone: 'warning', title: 'Alasan terlalu pendek', message: 'Tuliskan alasan minimal 3 karakter.' });
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.set('date', dateValue);
      form.set('type', type);
      form.set('reason', reason.trim());
      if (image?.uri) form.append('image', { uri: image.uri, name: image.fileName ?? 'lampiran.jpg', type: image.mimeType ?? 'image/jpeg' } as unknown as Blob);
      await leavesApi.create(form);
      toast.show({ tone: 'success', title: 'Pengajuan terkirim', message: 'Menunggu persetujuan guru. Cek statusnya di Riwayat.' });
      setReason('');
      setImage(null);
      onClose();
    } catch (e) {
      toast.show({ tone: 'danger', title: 'Gagal mengirim', message: e instanceof Error ? e.message : 'Terjadi kesalahan' });
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
                <Text style={styles.title}>Ajukan Izin / Sakit</Text>
                <Text style={styles.sub}>Pilih tanggal, lalu jelaskan alasanmu.</Text>
              </View>
              <Pressable onPress={close} hitSlop={8} style={styles.closeButton}>
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Tanggal</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
                {dayOptions().map((option) => {
                  const selected = option.value === dateValue;
                  return (
                    <PressableScale key={option.value} onPress={() => setDateValue(option.value)} style={[styles.dateChip, selected && styles.dateChipActive]}>
                      <Text style={[styles.dateWeekday, selected && styles.dateTextActive]}>{option.isToday ? 'Hari ini' : option.weekday}</Text>
                      <Text style={[styles.dateNumber, selected && styles.dateTextActive]}>{option.dayNumber}</Text>
                    </PressableScale>
                  );
                })}
              </ScrollView>

              <Text style={styles.label}>Jenis Pengajuan</Text>
              <View style={styles.typeRow}>
                {types.map((item) => {
                  const selected = item.value === type;
                  return (
                    <PressableScale key={item.value} onPress={() => setType(item.value)} style={[styles.typeCard, selected && styles.typeCardActive]}>
                      <Ionicons name={item.icon} size={20} color={selected ? colors.primary700 : colors.textSecondary} />
                      <Text style={[styles.typeLabel, selected && styles.typeLabelActive]}>{item.label}</Text>
                    </PressableScale>
                  );
                })}
              </View>

              <Input
                label="Alasan"
                multiline
                numberOfLines={3}
                onChangeText={setReason}
                placeholder="Contoh: demam tinggi, menghadiri acara keluarga"
                value={reason}
                style={styles.reasonInput}
              />

              <Text style={styles.label}>Lampiran Surat (opsional)</Text>
              {image?.uri ? (
                <View style={styles.attachPreview}>
                  <Image source={{ uri: image.uri }} style={styles.attachThumb} />
                  <Text numberOfLines={1} style={styles.attachName}>
                    {image.fileName ?? 'Lampiran dipilih'}
                  </Text>
                  <Pressable hitSlop={8} onPress={() => setImage(null)}>
                    <Ionicons name="trash-outline" size={17} color={colors.danger} />
                  </Pressable>
                </View>
              ) : (
                <PressableScale onPress={() => void pickImage()} style={styles.attachZone}>
                  <Ionicons name="cloud-upload-outline" size={22} color={colors.primary700} />
                  <Text style={styles.attachZoneText}>Unggah foto surat</Text>
                  <Text style={styles.attachZoneHint}>JPG/PNG · maksimal 5MB</Text>
                </PressableScale>
              )}

              <Button label={submitting ? 'Mengirim...' : 'Kirim Pengajuan'} onPress={() => void submit()} pending={submitting} />
              <Text style={styles.note}>Pengajuan ditinjau guru sebelum status izin berlaku.</Text>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(7,18,14,0.6)', flex: 1, justifyContent: 'flex-end' },
  backdropTouch: { flex: 1 },
  sheetWrap: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    height: '85%',
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
  label: { ...type.label, color: colors.textPrimary, marginBottom: spacing.xs + 2, marginTop: spacing.xs },
  dateRow: { gap: spacing.sm, paddingRight: spacing.sm },
  dateChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    minWidth: 72,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dateChipActive: { backgroundColor: colors.primary700 },
  dateWeekday: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, textTransform: 'capitalize' },
  dateNumber: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginTop: 2 },
  dateTextActive: { color: colors.textInverse },
  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeCard: {
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1.5,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  typeCardActive: { backgroundColor: colors.primary50, borderColor: colors.primary700 },
  typeLabel: { ...type.bodyStrong, color: colors.textSecondary },
  typeLabelActive: { color: colors.primary700 },
  reasonInput: { minHeight: 84, textAlignVertical: 'top' },
  attachZone: {
    alignItems: 'center',
    backgroundColor: colors.primary50,
    borderColor: colors.primary300,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
  },
  attachZoneText: { ...type.bodyStrong, color: colors.primary700, marginTop: spacing.xs },
  attachZoneHint: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  attachPreview: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  attachThumb: { borderRadius: radius.sm, height: 44, width: 44 },
  attachName: { ...type.caption, color: colors.textPrimary, flex: 1 },
  note: { ...type.caption, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' },
});
