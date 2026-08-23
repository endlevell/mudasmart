import { useRef, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming, type AnimatedRef } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Button } from '../components/ui/button';
import { PressableScale } from '../components/ui/pressable-scale';
import { MudasmartLogo } from '../components/brand/logo';
import { colors, radius, spacing, type } from '../constants/theme';
import { markOnboardingSeen } from '../utils/secure-storage';

const { width: WINDOW_WIDTH } = Dimensions.get('window');

// Garis pemindai bergerak untuk ilustrasi slide 2.
function ScanLine() {
  const y = useSharedValue(0);
  y.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }), -1, true);
  const style = useAnimatedStyle(() => ({ top: `${y.value * 100}%` }));
  return <Animated.View pointerEvents="none" style={[styles.scanLine, style]} />;
}

interface Slide {
  key: string;
  title: string;
  body: string;
  art: React.ReactNode;
}

// Onboarding first-launch — 3 slide paging dengan ilustrasi custom.
export default function OnboardingScreen() {
  const listRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const slides: Slide[] = [
    {
      key: 'welcome',
      title: 'Selamat datang di\nMUDASmart',
      body: 'Absensi sekolah jadi simpel: satu scan QR di gerbang, kehadiranmu langsung tercatat.',
      art: (
        <View style={styles.artStage}>
          <View style={styles.brandMark}>
            <MudasmartLogo size={64} variant="light" />
          </View>
          <View style={[styles.orb, styles.orbA]} />
          <View style={[styles.orb, styles.orbB]} />
        </View>
      ),
    },
    {
      key: 'how',
      title: 'Scan di gerbang,\nselesai dalam detik',
      body: 'Buka tab Scan, arahkan kamera ke QR gerbang, dan biarkan GPS memverifikasi lokasimu.',
      art: (
        <View style={styles.artStage}>
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            <Ionicons name="qr-code-outline" size={58} color={colors.primary300} />
            <ScanLine />
          </View>
        </View>
      ),
    },
    {
      key: 'stats',
      title: 'Pantau rekap\nkapan saja',
      body: 'Grafik kehadiran, status hadir/telat, dan riwayat bulanan — semua di genggamanmu.',
      art: (
        <View style={styles.artStage}>
          <View style={styles.chartPanel}>
            {[0.45, 0.75, 0.55, 0.95, 0.7].map((height, position) => (
              <View key={position} style={[styles.bar, { height: height * 90 }, position === 3 && styles.barHighlight]} />
            ))}
          </View>
          <View style={styles.trendPill}>
            <Ionicons name="trending-up" size={14} color={colors.primary700} />
            <Text style={styles.trendText}>Kehadiranmu naik</Text>
          </View>
        </View>
      ),
    },
  ];

  const finish = () => {
    void (async () => {
      await markOnboardingSeen();
      router.replace('/(auth)/login');
    })();
  };

  const goNext = () => {
    if (index >= slides.length - 1) {
      finish();
      return;
    }
    listRef.current?.scrollTo({ x: (index + 1) * WINDOW_WIDTH, animated: true });
  };

  return (
    <LinearGradient colors={['#073D2C', '#04231A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.flex}>
      <PressableScale onPress={finish} style={styles.skip}>
        <Text style={styles.skipText}>Lewati</Text>
      </PressableScale>

      <ScrollView
        ref={listRef as AnimatedRef<ScrollView>}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / WINDOW_WIDTH))}
      >
        {slides.map((slide) => (
          <View key={slide.key} style={{ width: WINDOW_WIDTH }}>
            <View style={styles.slide}>
              {slide.art}
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.body}>{slide.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((slide, position) => (
            <View key={slide.key} style={[styles.dot, position === index && styles.dotActive]} />
          ))}
        </View>
        <Button label={index === slides.length - 1 ? 'Mulai Sekarang' : 'Lanjut'} onPress={goNext} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  skip: { alignSelf: 'flex-end', paddingHorizontal: spacing.lg, paddingTop: spacing.xl + 8 },
  skipText: { ...type.label, color: 'rgba(255,255,255,0.65)' },
  slide: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
  artStage: { alignItems: 'center', height: 220, justifyContent: 'center', marginBottom: spacing.xl, width: 240 },
  orb: { borderRadius: radius.full, position: 'absolute' },
  orbA: { backgroundColor: 'rgba(111,203,163,0.16)', height: 190, left: -10, top: -6, width: 190 },
  orbB: { backgroundColor: 'rgba(255,255,255,0.06)', bottom: -4, height: 110, right: -14, width: 110 },
  brandMark: {
    alignItems: 'center',
    backgroundColor: 'rgba(111,203,163,0.18)',
    borderColor: 'rgba(111,203,163,0.5)',
    borderRadius: radius.xl,
    borderWidth: 1.5,
    height: 108,
    justifyContent: 'center',
    width: 108,
  },
  viewfinder: { alignItems: 'center', height: 168, justifyContent: 'center', width: 168 },
  corner: { borderColor: colors.primary300, borderWidth: 3, height: 34, position: 'absolute', width: 34 },
  cornerTL: { borderTopLeftRadius: 14, borderLeftWidth: 3, borderTopWidth: 3, left: 0, top: 0 },
  cornerTR: { borderTopRightRadius: 14, borderRightWidth: 3, borderTopWidth: 3, right: 0, top: 0 },
  cornerBL: { borderBottomLeftRadius: 14, borderBottomWidth: 3, borderLeftWidth: 3, bottom: 0, left: 0 },
  cornerBR: { borderBottomRightRadius: 14, borderBottomWidth: 3, borderRightWidth: 3, bottom: 0, right: 0 },
  scanLine: { backgroundColor: colors.primary300, borderRadius: radius.full, height: 2, left: 12, position: 'absolute', right: 12, shadowColor: colors.primary500, shadowOpacity: 0.9, shadowRadius: 8 },
  chartPanel: { alignItems: 'flex-end', backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(111,203,163,0.25)', borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: 12, padding: spacing.md },
  bar: { backgroundColor: colors.primary500, borderRadius: 6, width: 22 },
  barHighlight: { backgroundColor: colors.primary300 },
  trendPill: { alignItems: 'center', alignSelf: 'flex-end', backgroundColor: colors.primary100, borderRadius: radius.full, flexDirection: 'row', gap: 5, marginTop: spacing.sm, paddingHorizontal: 10, paddingVertical: 6 },
  trendText: { fontSize: 11, fontWeight: '800', color: colors.primary700 },
  title: { ...type.display, color: colors.textInverse, textAlign: 'center' },
  body: { ...type.body, color: 'rgba(255,255,255,0.72)', lineHeight: 22, marginTop: spacing.md, textAlign: 'center' },
  footer: { gap: spacing.lg, paddingBottom: spacing.xxl, paddingHorizontal: spacing.xl },
  dots: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  dot: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: radius.full, height: 7, width: 7 },
  dotActive: { backgroundColor: colors.primary300, width: 22 },
});
