import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '../../constants/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  pending?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'danger-outline';
}

export function Button({ label, onPress, pending = false, disabled = false, variant = 'primary' }: ButtonProps) {
  const isDanger = variant === 'danger-outline';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || pending}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isDanger ? styles.dangerOutline : styles.primary,
        pressed && styles.pressed,
        (disabled || pending) && styles.disabled,
      ]}
    >
      {pending ? (
        <ActivityIndicator color={isDanger ? colors.danger : '#FFFFFF'} />
      ) : (
        <Text style={[styles.label, isDanger && { color: colors.danger }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  primary: { backgroundColor: colors.primary700 },
  dangerOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.danger },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  label: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
