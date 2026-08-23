import { Alert, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { PressableScale } from '../../components/ui/pressable-scale';
import { ScreenHeader } from '../../components/ui/screen-header';
import { toast } from '../../components/ui/toast';
import { MudasmartLogo } from '../../components/brand/logo';
import { colors, gradients, radius, shadow, spacing, type } from '../../constants/theme';
import { gatesApi, type Gate } from '../../api/gates.api';

// Kartu QR siap cetak — identitas MUDASmart di atas, petunjuk di bawah.
function QrCard({ gate, size }: { gate: Gate; size: number }) {
  return (
    <View style={styles.printCard}>
      <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.printHead}>
        <View>
          <Text style={styles.printBrand}>MUDASmart</Text>
          <Text style={styles.printSub}>SMA Muhammadiyah 2 Tangerang</Text>
        </View>
        <MudasmartLogo size={26} variant="light" />
      </LinearGradient>
      <View style={styles.printBody}>
        <QRCode size={size} value={gate.qrCodeValue} />
        <View style={styles.printDivider} />
        <Text style={styles.printGate}>{gate.name}</Text>
        <Text style={styles.printHint}>Scan kode ini untuk mencatat kehadiran</Text>
      </View>
    </View>
  );
}

// Admin only — render QR untuk dicetak, regenerasi, geofence opsional.
export default function KelolaGerbangScreen() {
  const insets = useSafeAreaInsets();
  const [gates, setGates] = useState<Gate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({ name: '', latitude: '', longitude: '', radiusMeters: '' });
  const [viewer, setViewer] = useState<Gate | null>(null);
  const [savingQr, setSavingQr] = useState(false);
  const printRef = useRef<View>(null);

  const load = useCallback(async () => {
    try {
      setGates((await gatesApi.list()).data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat gerbang');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (!form.name.trim()) {
      setError('Nama gerbang wajib diisi');
      return;
    }
    setPending(true);
    try {
      await gatesApi.create({
        name: form.name.trim(),
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
        radiusMeters: form.radiusMeters ? Number(form.radiusMeters) : undefined,
      });
      setForm({ name: '', latitude: '', longitude: '', radiusMeters: '' });
      await load();
      toast.show({ tone: 'success', title: 'Gerbang ditambahkan', message: `${form.name.trim()} siap dipakai absensi.` });
      setError(null);
    } catch (e) {
      toast.show({ tone: 'danger', title: 'Gagal menambah gerbang', message: e instanceof Error ? e.message : 'Terjadi kesalahan' });
    } finally {
      setPending(false);
    }
  };

  const confirmRegenerate = (gate: Gate) => {
    Alert.alert('Regenerasi QR', `QR lama "${gate.name}" akan langsung tidak berlaku. Cetak ulang QR baru.`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Regenerasi',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await gatesApi.update(gate.id, { regenerateQr: true });
              await load();
              toast.show({ tone: 'success', title: 'QR diregenerasi', message: `QR baru "${gate.name}" siap dicetak.` });
            } catch (e) {
              toast.show({ tone: 'danger', title: 'Gagal regenerasi QR', message: e instanceof Error ? e.message : 'Terjadi kesalahan' });
            }
          })();
        },
      },
    ]);
  };

  // Capture kartu QR → PNG → share sheet (bisa disimpan ke galeri dari sana).
  const shareQr = async () => {
    if (!viewer || !printRef.current) return;
    setSavingQr(true);
    try {
      const uri = await captureRef(printRef, { format: 'png', quality: 1, result: 'tmpfile' });
      if (!(await Sharing.isAvailableAsync())) throw new Error('Perangkat tidak mendukung berbagi file');
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: `QR ${viewer.name}` });
    } catch (e) {
      Alert.alert('Gagal', e instanceof Error ? e.message : 'Tidak bisa membuat gambar QR');
    } finally {
      setSavingQr(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.backgroundAlt }} contentContainerStyle={[styles.container, { paddingBottom: 140 }]}>
      <ScreenHeader title="Kelola Gerbang" subtitle="QR absensi & geofence" />
      <View style={styles.content}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {gates.map((gate, index) => (
          <Animated.View key={gate.id} entering={FadeInDown.delay(index * 60)}>
            <Card style={styles.card}>
              <PressableScale onPress={() => setViewer(gate)} style={styles.qrBox}>
                <QRCode size={150} value={gate.qrCodeValue} />
                <View style={styles.qrZoomHint}>
                  <Ionicons name="expand-outline" size={12} color={colors.textSecondary} />
                  <Text style={styles.qrZoomText}>Ketuk untuk perbesar</Text>
                </View>
              </PressableScale>
              <View style={styles.titleRow}>
                <View style={styles.nameRow}>
                  <Ionicons name="business-outline" size={16} color={colors.primary700} />
                  <Text numberOfLines={1} style={styles.name}>{gate.name}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: gate.isActive ? colors.primary100 : colors.surfaceMuted }]}>
                  <View style={[styles.statusDot, { backgroundColor: gate.isActive ? colors.primary500 : colors.textSecondary }]} />
                  <Text style={[styles.statusText, { color: gate.isActive ? colors.primary700 : colors.textSecondary }]}>
                    {gate.isActive ? 'Aktif' : 'Nonaktif'}
                  </Text>
                </View>
              </View>
              <View style={styles.codeBox}>
                <Text selectable style={styles.codeText}>
                  {gate.qrCodeValue}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.meta}>
                  {gate.latitude != null && gate.longitude != null ? `${gate.latitude}, ${gate.longitude}` : 'Tanpa geofence'}
                  {gate.radiusMeters ? ` · radius ${gate.radiusMeters} m` : ''}
                </Text>
              </View>
              <Button label="Regenerasi QR" onPress={() => confirmRegenerate(gate)} variant="danger-outline" />
            </Card>
          </Animated.View>
        ))}

        <Animated.View entering={FadeInDown.delay(gates.length * 60)}>
          <Card style={styles.card}>
            <View style={styles.formHead}>
              <View style={styles.formIcon}>
                <Ionicons name="add" size={18} color={colors.primary700} />
              </View>
              <Text style={styles.sectionTitle}>Tambah Gerbang</Text>
            </View>
            <Input label="Nama Gerbang" onChangeText={(name) => setForm((prev) => ({ ...prev, name }))} value={form.name} />
            <Input keyboardType="numbers-and-punctuation" label="Latitude (opsional)" onChangeText={(latitude) => setForm((prev) => ({ ...prev, latitude }))} placeholder="-6.123456" value={form.latitude} />
            <Input keyboardType="numbers-and-punctuation" label="Longitude (opsional)" onChangeText={(longitude) => setForm((prev) => ({ ...prev, longitude }))} placeholder="106.654321" value={form.longitude} />
            <Input keyboardType="number-pad" label="Radius Geofence meter (opsional)" onChangeText={(radiusMeters) => setForm((prev) => ({ ...prev, radiusMeters }))} placeholder="50" value={form.radiusMeters} />
            <Button label="Tambah Gerbang" onPress={() => void submit()} pending={pending} />
          </Card>
        </Animated.View>
      </View>

      {/* Viewer fullscreen — kartu QR branded, bisa dibagikan/disimpan sebagai PNG.
          statusBarTranslucent/navigationBarTranslucent wajib agar menutupi seluruh layar di Android. */}
      <Modal
        animationType="fade"
        hardwareAccelerated
        navigationBarTranslucent
        onRequestClose={() => setViewer(null)}
        statusBarTranslucent
        visible={viewer !== null}
      >
        <LinearGradient colors={['#073D2C', '#04231A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.viewerBg}>
          <View style={[styles.viewerTop, { paddingTop: insets.top + spacing.sm }]}>
            <View style={styles.viewerHeading}>
              <Ionicons name="business-outline" size={18} color={colors.primary300} />
              <Text numberOfLines={1} style={styles.viewerTitle}>{viewer?.name}</Text>
            </View>
            <PressableScale onPress={() => setViewer(null)} style={styles.viewerClose}>
              <Ionicons name="close" size={20} color={colors.textInverse} />
            </PressableScale>
          </View>

          {viewer ? (
            <>
              <ScrollView contentContainerStyle={styles.viewerScroll}>
                <View collapsable={false} ref={printRef}>
                  <QrCard gate={viewer} size={252} />
                </View>
                <Text style={styles.viewerHint}>Bagikan atau simpan kartu ini untuk dicetak & dipasang di gerbang.</Text>
              </ScrollView>
              <View style={[styles.viewerActions, { paddingBottom: insets.bottom + spacing.lg }]}>
                <Button label={savingQr ? 'Menyiapkan...' : 'Simpan / Bagikan QR'} onPress={() => void shareQr()} pending={savingQr} />
              </View>
            </>
          ) : null}
        </LinearGradient>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.backgroundAlt },
  content: { gap: spacing.md, padding: spacing.md },
  card: { gap: spacing.sm },
  qrBox: { alignItems: 'center', alignSelf: 'center', backgroundColor: '#FFFFFF', borderRadius: radius.lg, padding: spacing.sm, ...{ shadowColor: '#0B3D2C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 2 } },
  qrZoomHint: { alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: spacing.xs },
  qrZoomText: { fontSize: 10, fontWeight: '600', color: colors.textSecondary },
  titleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  nameRow: { alignItems: 'center', flexDirection: 'row', flexShrink: 1, gap: 6 },
  name: { ...type.heading, color: colors.primary900, flexShrink: 1 },
  statusPill: { alignItems: 'center', borderRadius: radius.full, flexDirection: 'row', gap: 5, paddingHorizontal: 9, paddingVertical: 4 },
  statusDot: { borderRadius: radius.full, height: 6, width: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  codeBox: { backgroundColor: colors.surfaceMuted, borderRadius: radius.sm, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 2 },
  codeText: { ...type.caption, letterSpacing: 0.4, color: colors.textPrimary },
  metaRow: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  meta: { ...type.caption, color: colors.textSecondary, flexShrink: 1 },
  formHead: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm + 2 },
  formIcon: { alignItems: 'center', backgroundColor: colors.primary50, borderRadius: 10, height: 34, justifyContent: 'center', width: 34 },
  sectionTitle: { ...type.heading, color: colors.primary700, flex: 1 },
  error: { color: colors.danger, fontSize: type.caption.fontSize },

  viewerBg: { flex: 1 },
  viewerTop: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm + 2, justifyContent: 'space-between', paddingHorizontal: spacing.lg },
  viewerHeading: { alignItems: 'center', flexDirection: 'row', flex: 1, gap: spacing.sm + 2, marginRight: spacing.md },
  viewerTitle: { ...type.title, color: colors.textInverse, flexShrink: 1 },
  viewerClose: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: radius.full, height: 38, justifyContent: 'center', width: 38 },
  viewerScroll: { alignItems: 'center', flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  viewerHint: { ...type.caption, color: 'rgba(255,255,255,0.65)', marginTop: spacing.lg, textAlign: 'center' },
  viewerActions: { paddingHorizontal: spacing.lg },

  printCard: { backgroundColor: '#FFFFFF', borderRadius: radius.xl, overflow: 'hidden', width: 320, ...shadow.floating },
  printHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  printBrand: { color: colors.textInverse, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  printSub: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '600', marginTop: 1 },
  printBody: { alignItems: 'center', padding: spacing.lg },
  printDivider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth, marginBottom: spacing.sm, marginTop: spacing.md, width: '100%' },
  printGate: { color: colors.primary900, fontSize: type.bodyStrong.fontSize, fontWeight: '800' },
  printHint: { color: colors.textSecondary, fontSize: 11, fontWeight: '600', marginTop: 3 },
});
