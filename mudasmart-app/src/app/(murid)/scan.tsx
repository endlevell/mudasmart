import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { Button } from '../../components/ui/button';
import { colors, radius, spacing } from '../../constants/theme';
import { attendanceApi, type ScanResult } from '../../api/attendance.api';

type ScanState = 'idle' | 'processing' | 'success' | 'error';

// Scan kamera live-only — tanpa galeri (edge case 7). Nonce sama dipakai ulang saat Coba Lagi (edge case 4).
export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<ScanState>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nonceRef = useRef<string>(crypto.randomUUID());
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
        <Text style={styles.permissionText}>Izinkan akses kamera untuk memindai QR absensi.</Text>
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
                <Button label="Kembali" onPress={() => router.back()} />
              </>
            ) : (
              <>
                <Text style={[styles.resultTitle, { color: colors.danger }]}>Gagal</Text>
                <Text style={styles.resultMessage}>{error}</Text>
                <Button label="Coba Lagi" onPress={retry} />
                <Button label="Tutup" onPress={() => router.back()} variant="danger-outline" />
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
  permissionText: { color: '#FFFFFF', fontSize: 15, marginBottom: spacing.md, textAlign: 'center' },
  dark: { backgroundColor: '#111827' },
  camera: { flex: 1 },
  overlay: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', flex: 1, justifyContent: 'center' },
  viewfinder: { borderColor: colors.primary300, borderRadius: radius.lg, borderWidth: 3, height: 240, width: 240 },
  hint: { color: '#FFFFFF', fontSize: 15, marginTop: spacing.lg, textAlign: 'center' },
  processing: { alignItems: 'center', marginTop: spacing.md },
  modalBackdrop: { backgroundColor: 'rgba(0,0,0,0.5)', flex: 1, justifyContent: 'center', padding: spacing.lg },
  modalCard: { backgroundColor: colors.background, borderRadius: radius.lg, gap: spacing.sm, padding: spacing.xl },
  successBorder: { borderTopWidth: 4, borderTopColor: colors.primary700 },
  errorBorder: { borderTopWidth: 4, borderTopColor: colors.danger },
  resultTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  resultMessage: { color: colors.textPrimary, fontSize: 15, textAlign: 'center' },
  resultTime: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
  statusLabel: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
});
