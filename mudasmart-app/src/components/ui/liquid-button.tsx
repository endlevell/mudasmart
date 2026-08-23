import { Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, gradients, radius, shadow, spacing, type } from '../../constants/theme';

interface LiquidButtonProps {
  label: string;
  onPress: () => void;
  pending?: boolean;
}

// Tombol sesi: goyang saat ditekan, "air" mengisi selama menunggu respons server.
export function LiquidButton({ label, onPress, pending = false }: LiquidButtonProps) {
  const shake = useSharedValue(0);
  const fill = useSharedValue(0);

  useEffect(() => {
    if (pending) {
      fill.value = 0;
      fill.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, false);
    } else {
      fill.value = withTiming(0, { duration: 200 });
    }
  }, [pending, fill]);

  const start = () => {
    // Goyang kecil: masuk terasa fisik.
    shake.value = withSequence(
      withTiming(-2, { duration: 50 }),
      withTiming(2, { duration: 50 }),
      withTiming(-1.5, { duration: 45 }),
      withTiming(0, { duration: 60 }),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const fillStyle = useAnimatedStyle(() => ({ height: `${fill.value * 100}%` }));

  return (
    <Pressable
      accessibilityRole="button"
      disabled={pending}
      onPressIn={start}
      onPress={onPress}
    >
      <Animated.View style={[styles.base, shadow.floating, shakeStyle]}>
        <LinearGradient colors={pending ? ['#6B7280', '#4B5563'] : gradients.fresh} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill}>
          {/* Lapisan "air" naik dari bawah selama pending. */}
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.fillLayer, fillStyle]} />
          <Text style={styles.label}>{label}</Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, overflow: 'hidden' },
  fill: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.lg,
  },
  fillLayer: { backgroundColor: 'rgba(255,255,255,0.28)', bottom: 0, position: 'absolute', width: '100%' },
  label: { ...type.bodyStrong, color: colors.textInverse, fontWeight: '800', letterSpacing: 0.2 },
});
