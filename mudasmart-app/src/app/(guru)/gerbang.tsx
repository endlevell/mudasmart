import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { ScreenHeader } from '../../components/ui/screen-header';
import { colors, radius, spacing, type } from '../../constants/theme';
import { gatesApi, type Gate } from '../../api/gates.api';

// Admin only — render QR untuk dicetak, regenerasi, geofence opsional.
export default function KelolaGerbangScreen() {
  const [gates, setGates] = useState<Gate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({ name: '', latitude: '', longitude: '', radiusMeters: '' });

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
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menambah gerbang');
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
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Gagal regenerasi QR');
            }
          })();
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.backgroundAlt }} contentContainerStyle={[styles.container, { paddingBottom: 140 }]}>
      <ScreenHeader title="Kelola Gerbang" subtitle="QR absensi & geofence" />
      <View style={styles.content}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {gates.map((gate, index) => (
          <Animated.View key={gate.id} entering={FadeInDown.delay(index * 60)}>
            <Card style={styles.card}>
              <View style={styles.qrBox}>
                <QRCode size={150} value={gate.qrCodeValue} />
              </View>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.backgroundAlt },
  content: { gap: spacing.md, padding: spacing.md },
  card: { gap: spacing.sm },
  qrBox: { alignItems: 'center', alignSelf: 'center', backgroundColor: '#FFFFFF', borderRadius: radius.lg, padding: spacing.sm, ...{ shadowColor: '#0B3D2C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 2 } },
  titleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  nameRow: { alignItems: 'center', flexDirection: 'row', flexShrink: 1, gap: 6 },
  name: { ...type.heading, color: colors.primary900, flexShrink: 1 },
  statusPill: { alignItems: 'center', borderRadius: radius.full, flexDirection: 'row', gap: 5, paddingHorizontal: 9, paddingVertical: 4 },
  statusDot: { borderRadius: radius.full, height: 6, width: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  codeBox: { backgroundColor: colors.surfaceMuted, borderRadius: radius.sm, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 2 },
  codeText: { ...type.caption, fontFamily: undefined, letterSpacing: 0.4, color: colors.textPrimary },
  metaRow: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  meta: { ...type.caption, color: colors.textSecondary, flexShrink: 1 },
  formHead: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm + 2 },
  formIcon: { alignItems: 'center', backgroundColor: colors.primary50, borderRadius: 10, height: 34, justifyContent: 'center', width: 34 },
  sectionTitle: { ...type.heading, color: colors.primary700, flex: 1 },
  error: { color: colors.danger, fontSize: type.caption.fontSize },
});
