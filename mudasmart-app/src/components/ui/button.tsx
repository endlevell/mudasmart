import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, gradients, radius, shadow, spacing, type } from '../../constants/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  pending?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'gradient' | 'danger-outline' | 'ghost';
}

// Tombol utama pakai gradien + glow; varian lain tetap tenang.
export function Button({ label, onPress, pending = false, disabled = false, variant = 'gradient' }: ButtonProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const isDanger = variant === 'danger-outline';
  const isGhost = variant === 'ghost';
  const inactive = disabled || pending;

  // Disabled/pending tampil solid redup — opacity bikin gradien tampak putih tembus pandang.
  const contentColor = inactive
    ? isDanger || isGhost
      ? colors.textSecondary
      : colors.textInverse
    : isDanger
      ? colors.danger
      : isGhost
        ? colors.primary700
        : colors.textInverse;

  const content = pending ? (
    <ActivityIndicator color={contentColor} />
  ) : (
    <Text style={[styles.label, { color: contentColor }]}>{label}</Text>
  );

  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(0.96, { duration: 90 });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }}
      onPressOut={() => (scale.value = withTiming(1, { duration: 150 }))}
    >
      <Animated.View style={[styles.base, styles.baseFallback, animated]}>
        {variant === 'gradient' ? (
          <LinearGradient
            colors={inactive ? gradients.disabled : gradients.fresh}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.fill, inactive ? null : shadow.floating]}
          >
            {content}
          </LinearGradient>
        ) : (
          <View style={[styles.fill, inactive ? styles.inactiveFill : isDanger ? styles.dangerOutline : isGhost ? styles.ghost : styles.primary]}>
            {content}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md },
  fill: {
    alignItems: 'center',
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  primary: { backgroundColor: colors.primary700 },
  baseFallback: { backgroundColor: colors.primary700 },
  dangerOutline: { backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.danger },
  ghost: { backgroundColor: colors.primary100 },
  inactiveFill: { backgroundColor: colors.borderStrong },
  label: { color: colors.textInverse, fontSize: type.bodyStrong.fontSize, fontWeight: '800', letterSpacing: 0.2 },
});
