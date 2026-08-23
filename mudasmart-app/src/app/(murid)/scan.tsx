import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { Button } from '../../components/ui/button';
import { colors, radius, shadow, spacing, type } from '../../constants/theme';
import { attendanceApi, type ScanResult } from '../../api/attendance.api';

type ScanState = 'idle' | 'processing' | 'success' | 'error';

// Scan kamera live-only — tanpa galeri (edge case 7). Nonce sama dipakai ulang saat Coba Lagi (edge case 4).
export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<ScanState>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nonceRef = useRef<string>(Crypto.randomUUID());
  const lockedRef = useRef(false);

  const handleScan = async (event: { data: string }) => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    setState('processing');
    try {
      let location: Location.LocationObject | null = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') location = await Location.getCurrentPositionAsync({});
      } catch {
        // GPS gagal/izin ditolak — server yang memutus bila gerbang mewajibkan geofence.
      }
      const response = await attendanceApi.scan(
        event.data,
        nonceRef.current,
        location ? { latitude: location.coords.latitude, longitude: location.coords.longitude } : undefined,
      );
      setResult(response);
      setState('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan');
      setState('error');
    }
  };

  const retry = () => {
    // Nonce TIDAK di-generate ulang — retry koneksi harus idempoten.
    setError(null);
    setState('idle');
    lockedRef.current = false;
  };

  if (!permission) return <View style={styles.center} />;
  if (!permission.granted) {
    return (
      <View style={[styles.center, styles.dark]}>
        <Text style={styles.hint}>Izinkan akses kamera untuk memindai QR absensi.</Text>
        <Button label="Beri Izin Kamera" onPress={() => void requestPermission()} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <CameraView
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={(event) => void handleScan({ data: event.data })}
        style={styles.camera}
      >
        <View style={styles.overlay}>
          <View style={styles.viewfinder} />
          <Text style={styles.hint}>Arahkan kamera ke QR di gerbang</Text>
          {state === 'processing' ? (
            <View style={styles.processing}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={styles.hint}>Memproses...</Text>
            </View>
          ) : null}
        </View>
      </CameraView>

      <Modal transparent visible={state === 'success' || state === 'error'} onRequestClose={retry}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, state === 'success' ? styles.successBorder : styles.errorBorder]}>
            {state === 'success' && result ? (
              <>
                <Text style={[styles.resultTitle, { color: colors.primary700 }]}>Berhasil</Text>
                <Text style={styles.resultMessage}>{result.message}</Text>
                <Text style={styles.resultTime}>
                  {new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(result.scannedAt)).replace(':', ':')} WIB
                </Text>
                <Text style={[styles.statusLabel, { color: result.status === 'hadir' ? colors.primary700 : colors.warning }]}>
                  Status: {result.status.toUpperCase()}
                </Text>
                <Button label="Kembali ke Beranda" onPress={() => router.navigate("/(murid)")} />
              </>
            ) : (
              <>
                <Text style={[styles.resultTitle, { color: colors.danger }]}>Gagal</Text>
                <Text style={styles.resultMessage}>{error}</Text>
                <Button label="Coba Lagi" onPress={retry} />
                <Button label="Tutup" onPress={() => router.navigate("/(murid)")} variant="danger-outline" />
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', backgroundColor: colors.backgroundAlt, flex: 1, justifyContent: 'center', padding: spacing.lg },
  dark: { backgroundColor: colors.dark },
  camera: { flex: 1 },
  overlay: { alignItems: 'center', backgroundColor: 'rgba(7,18,14,0.55)', flex: 1, justifyContent: 'center' },
  viewfinder: {
    borderColor: colors.primary300,
    borderRadius: radius.xl,
    borderWidth: 2,
    height: 250,
    shadowColor: colors.primary500,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    width: 250,
  },
  hint: { ...type.body, color: '#FFFFFF', marginTop: spacing.lg, textAlign: 'center' },
  processing: { alignItems: 'center', backgroundColor: 'rgba(11,110,79,0.85)', borderRadius: radius.full, flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  modalBackdrop: { backgroundColor: 'rgba(7,18,14,0.6)', flex: 1, justifyContent: 'center', padding: spacing.lg },
  modalCard: { backgroundColor: colors.background, borderRadius: radius.xl, gap: spacing.sm, padding: spacing.xl, ...shadow.floating },
  successBorder: { borderTopWidth: 4, borderTopColor: colors.primary700 },
  errorBorder: { borderTopWidth: 4, borderTopColor: colors.danger },
  resultTitle: { ...type.title, textAlign: 'center' },
  resultMessage: { ...type.body, color: colors.textPrimary, textAlign: 'center' },
  resultTime: { ...type.caption, color: colors.textSecondary, textAlign: 'center' },
  statusLabel: { ...type.bodyStrong, textAlign: 'center' },
});
