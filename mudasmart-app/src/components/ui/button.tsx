import { Pressable, StyleSheet, Text, View , ActivityIndicator } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, radius, shadow, spacing, type } from '../../constants/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  pending?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'danger-outline' | 'ghost';
  icon?: React.ReactNode;
}

// Tombol dengan umpan balik tekan (scale) — micro-interaction standar.
export function Button({ label, onPress, pending = false, disabled = false, variant = 'primary', icon }: ButtonProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const isDanger = variant === 'danger-outline';
  const isGhost = variant === 'ghost';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || pending}
      onPress={onPress}
      onPressIn={() => (scale.value = withTiming(0.97, { duration: 90 }))}
      onPressOut={() => (scale.value = withTiming(1, { duration: 140 }))}
    >
      <Animated.View
        style={[
          styles.base,
          isDanger && styles.dangerOutline,
          isGhost && styles.ghost,
          !isDanger && !isGhost && styles.primary,
          !isGhost && shadow.card,
          (disabled || pending) && styles.disabled,
          animated,
        ]}
      >
        {pending ? (
          <ActivityIndicator color={isDanger || isGhost ? colors.primary700 : colors.textInverse} />
        ) : (
          <View style={styles.row}>
            {icon}
            <Text style={[styles.label, isDanger && { color: colors.danger }, isGhost && { color: colors.primary700 }]}>{label}</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  primary: { backgroundColor: colors.primary700 },
  dangerOutline: { backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.danger },
  ghost: { backgroundColor: colors.primary100 },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.45 },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  label: { color: colors.textInverse, fontSize: type.bodyStrong.fontSize, fontWeight: '700' },
});
