import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/button';
import { colors, radius, shadow, spacing, type } from '../../constants/theme';
import { attendanceApi, type ScanResult } from '../../api/attendance.api';

type ScanState = 'idle' | 'processing' | 'success' | 'error';

// Garis scan bergerak naik-turun di dalam viewfinder.
function ScanLine({ active }: { active: boolean }) {
  const y = useSharedValue(0);
  useEffect(() => {
    if (active) {
      y.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1, true);
    } else {
      y.value = withTiming(0, { duration: 200 });
    }
  }, [active, y]);
  const style = useAnimatedStyle(() => ({ top: `${y.value * 100}%`, opacity: active ? 1 : 0 }));
  return <Animated.View pointerEvents="none" style={[styles.scanLine, style]} />;
}

// Sudut viewfinder gaya bracket — 4 siku L dengan glow hijau.
function Corner({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const base = styles.corner;
  const map = { tl: styles.cornerTL, tr: styles.cornerTR, bl: styles.cornerBL, br: styles.cornerBR } as const;
  return <View style={[base, map[position]]} />;
}

// Scan kamera live-only — tanpa galeri (edge case 7). Nonce sama dipakai ulang saat Coba Lagi (edge case 4).
export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<ScanState>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
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
      <LinearGradient colors={['#073D2C', '#04231A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.center}>
        <View style={styles.permissionIcon}>
          <Ionicons name="camera-outline" size={30} color={colors.primary300} />
        </View>
        <Text style={styles.permissionTitle}>Kamera dibutuhkan</Text>
        <Text style={styles.permissionHint}>Izinkan akses kamera untuk memindai QR absensi di gerbang sekolah.</Text>
        <Button label="Beri Izin Kamera" onPress={() => void requestPermission()} />
      </LinearGradient>
    );
  }

  return (
    <View style={styles.flex}>
      <CameraView
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        enableTorch={torch}
        onBarcodeScanned={(event) => void handleScan({ data: event.data })}
        style={styles.camera}
      >
        <View style={styles.overlay}>
          {/* Header overlay */}
          <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
            <Pressable onPress={() => router.navigate('/(murid)')} style={styles.topButton}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </Pressable>
            <View>
              <Text style={styles.topTitle}>Scan Absensi</Text>
              <Text style={styles.topSub}>Gerbang SMA Muhammadiyah 2</Text>
            </View>
            <Pressable onPress={() => setTorch((prev) => !prev)} style={[styles.topButton, torch && styles.torchOn]}>
              <Ionicons name="flash" size={20} color={torch ? colors.warning : '#FFFFFF'} />
            </Pressable>
          </View>

          {/* Viewfinder */}
          <View style={styles.viewfinder}>
            <Corner position="tl" />
            <Corner position="tr" />
            <Corner position="bl" />
            <Corner position="br" />
            <ScanLine active={state === 'idle'} />
          </View>

          {/* Status di bawah viewfinder */}
          {state === 'processing' ? (
            <View style={styles.processing}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={styles.processingText}>Memproses absensi...</Text>
            </View>
          ) : (
            <View style={styles.statusPill}>
              <View style={styles.pulseDot} />
              <Text style={styles.statusText}>Arahkan ke QR gerbang</Text>
            </View>
          )}

          <View style={{ flex: 1 }} />

          {/* Kartu panduan */}
          <View style={[styles.guideCard, { marginBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.guideRow}>
              <Ionicons name="location" size={15} color={colors.primary300} />
              <Text style={styles.guideText}>GPS aktif membuat absensi terverifikasi.</Text>
            </View>
            <View style={styles.guideRow}>
              <Ionicons name="time" size={15} color={colors.primary300} />
              <Text style={styles.guideText}>Status hadir/telat dihitung dari jam server.</Text>
            </View>
          </View>
        </View>
      </CameraView>

      <Modal transparent visible={state === 'success' || state === 'error'} onRequestClose={retry}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, state === 'success' ? styles.successBorder : styles.errorBorder]}>
            {state === 'success' && result ? (
              <>
                <View style={[styles.resultIcon, { backgroundColor: result.status === 'hadir' ? colors.primary100 : colors.warningBg }]}>
                  <Ionicons name={result.status === 'hadir' ? 'checkmark' : 'time'} size={34} color={result.status === 'hadir' ? colors.primary700 : '#B45309'} />
                </View>
                <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>Absensi Tercatat!</Text>
                <Text style={styles.resultMessage}>{result.message}</Text>
                <View style={styles.resultMeta}>
                  <View style={styles.resultChip}>
                    <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                    <Text style={styles.resultChipText}>
                      {new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(result.scannedAt))} WIB
                    </Text>
                  </View>
                  <View style={[styles.resultChip, { backgroundColor: result.status === 'hadir' ? colors.primary100 : colors.warningBg }]}>
                    <Text style={[styles.resultChipText, { color: result.status === 'hadir' ? colors.primary700 : '#B45309', textTransform: 'capitalize' }]}>
                      {result.status}
                    </Text>
                  </View>
                </View>
                <Button label="Kembali ke Beranda" onPress={() => router.navigate('/(murid)')} />
              </>
            ) : (
              <>
                <View style={[styles.resultIcon, { backgroundColor: colors.dangerBg }]}>
                  <Ionicons name="alert-circle" size={34} color={colors.danger} />
                </View>
                <Text style={[styles.resultTitle, { color: colors.danger }]}>Gagal</Text>
                <Text style={styles.resultMessage}>{error}</Text>
                <Button label="Coba Lagi" onPress={retry} />
                <Button label="Tutup" onPress={() => router.navigate('/(murid)')} variant="danger-outline" />
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.dark },
  center: { alignItems: 'center', flex: 1, gap: spacing.md, justifyContent: 'center', padding: spacing.xl },
  permissionIcon: { alignItems: 'center', backgroundColor: 'rgba(111,203,163,0.14)', borderColor: 'rgba(111,203,163,0.35)', borderRadius: radius.full, borderWidth: 1.5, height: 72, justifyContent: 'center', width: 72 },
  permissionTitle: { ...type.title, color: colors.textInverse },
  permissionHint: { ...type.body, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  camera: { flex: 1 },
  overlay: { backgroundColor: 'rgba(7,18,14,0.55)', flex: 1 },
  topBar: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg },
  topButton: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: radius.full, height: 40, justifyContent: 'center', width: 40 },
  torchOn: { backgroundColor: 'rgba(245,158,11,0.25)' },
  topTitle: { ...type.heading, color: '#FFFFFF' },
  topSub: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.65)' },
  viewfinder: { alignSelf: 'center', height: 252, marginTop: spacing.xxl, width: 252 },
  corner: { borderColor: colors.primary300, borderWidth: 3, height: 42, position: 'absolute', width: 42 },
  cornerTL: { borderTopLeftRadius: 18, borderLeftWidth: 3, borderTopWidth: 3, left: 0, top: 0 },
  cornerTR: { borderTopRightRadius: 18, borderRightWidth: 3, borderTopWidth: 3, right: 0, top: 0 },
  cornerBL: { borderBottomLeftRadius: 18, borderBottomWidth: 3, borderLeftWidth: 3, bottom: 0, left: 0 },
  cornerBR: { borderBottomRightRadius: 18, borderBottomWidth: 3, borderRightWidth: 3, bottom: 0, right: 0 },
  scanLine: { backgroundColor: colors.primary300, borderRadius: radius.full, height: 2, left: 14, position: 'absolute', right: 14, shadowColor: colors.primary500, shadowOpacity: 0.9, shadowRadius: 8 },
  statusPill: { alignItems: 'center', alignSelf: 'center', backgroundColor: 'rgba(7,61,44,0.75)', borderColor: 'rgba(111,203,163,0.35)', borderRadius: radius.full, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  pulseDot: { backgroundColor: colors.primary300, borderRadius: radius.full, height: 8, width: 8 },
  statusText: { ...type.label, color: '#FFFFFF' },
  processing: { alignItems: 'center', alignSelf: 'center', backgroundColor: 'rgba(11,110,79,0.9)', borderRadius: radius.full, flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2 },
  processingText: { ...type.label, color: '#FFFFFF' },
  guideCard: { backgroundColor: 'rgba(7,61,44,0.72)', borderColor: 'rgba(111,203,163,0.22)', borderRadius: radius.lg, borderWidth: 1, gap: spacing.sm, marginHorizontal: spacing.lg, padding: spacing.md },
  guideRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  guideText: { ...type.caption, color: 'rgba(255,255,255,0.85)', flex: 1 },
  modalBackdrop: { backgroundColor: 'rgba(7,18,14,0.72)', flex: 1, justifyContent: 'center', padding: spacing.lg },
  modalCard: { backgroundColor: colors.background, borderRadius: radius.xl, gap: spacing.sm, padding: spacing.xl, ...shadow.floating },
  successBorder: { borderTopWidth: 4, borderTopColor: colors.primary700 },
  errorBorder: { borderTopWidth: 4, borderTopColor: colors.danger },
  resultIcon: { alignItems: 'center', alignSelf: 'center', borderRadius: radius.full, height: 68, justifyContent: 'center', marginBottom: spacing.xs, width: 68 },
  resultTitle: { ...type.title, textAlign: 'center' },
  resultMessage: { ...type.body, color: colors.textPrimary, textAlign: 'center' },
  resultMeta: { alignSelf: 'stretch', flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginBottom: spacing.sm },
  resultChip: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.full, flexDirection: 'row', gap: 4, paddingHorizontal: 10, paddingVertical: 5 },
  resultChipText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
});
