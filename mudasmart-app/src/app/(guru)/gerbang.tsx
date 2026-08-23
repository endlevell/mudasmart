import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '../../components/ui/badge';
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
    <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 140 }]}>
      <ScreenHeader title="Kelola Gerbang" subtitle="QR absensi & geofence" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {gates.map((gate) => (
        <Card key={gate.id} style={styles.card}>
          <View style={styles.qrBox}>
            <QRCode size={150} value={gate.qrCodeValue} />
          </View>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{gate.name}</Text>
            <Badge label={gate.isActive ? 'Aktif' : 'Nonaktif'} tone={gate.isActive ? 'success' : 'neutral'} />
          </View>
          <Text style={styles.meta} selectable>
            {gate.qrCodeValue}
          </Text>
          <Text style={styles.meta}>
            {gate.latitude != null && gate.longitude != null ? `Geofence: ${gate.latitude}, ${gate.longitude}` : 'Tanpa geofence'}
            {gate.radiusMeters ? ` (${gate.radiusMeters} m)` : ''}
          </Text>
          <Button label="Regenerasi QR" onPress={() => confirmRegenerate(gate)} variant="danger-outline" />
        </Card>
      ))}

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Tambah Gerbang</Text>
        <Input label="Nama Gerbang" onChangeText={(name) => setForm((prev) => ({ ...prev, name }))} value={form.name} />
        <Input keyboardType="numbers-and-punctuation" label="Latitude (opsional)" onChangeText={(latitude) => setForm((prev) => ({ ...prev, latitude }))} placeholder="-6.123456" value={form.latitude} />
        <Input keyboardType="numbers-and-punctuation" label="Longitude (opsional)" onChangeText={(longitude) => setForm((prev) => ({ ...prev, longitude }))} placeholder="106.654321" value={form.longitude} />
        <Input keyboardType="number-pad" label="Radius Geofence meter (opsional)" onChangeText={(radiusMeters) => setForm((prev) => ({ ...prev, radiusMeters }))} placeholder="50" value={form.radiusMeters} />
        <Button label="Tambah Gerbang" onPress={() => void submit()} pending={pending} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.backgroundAlt, gap: spacing.md, padding: spacing.md },
  card: { gap: spacing.sm },
  qrBox: { alignItems: 'center', alignSelf: 'center', backgroundColor: '#FFFFFF', borderRadius: radius.lg, padding: spacing.sm, ...{ shadowColor: '#0B3D2C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 2 } },
  titleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  name: { ...type.heading, color: colors.primary900 },
  sectionTitle: { ...type.label, color: colors.textSecondary, textTransform: 'uppercase' },
  meta: { ...type.caption, color: colors.textSecondary },
  error: { color: colors.danger, fontSize: type.caption.fontSize },
});
