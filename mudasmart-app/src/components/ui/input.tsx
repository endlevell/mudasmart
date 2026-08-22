import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radius, spacing, type } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, focused && styles.focused, error && styles.invalid]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: { ...type.label, color: colors.textPrimary, marginBottom: spacing.xs + 2 },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: type.body.fontSize,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  focused: { backgroundColor: colors.background, borderColor: colors.primary700, borderWidth: 2 },
  invalid: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: type.caption.fontSize, marginTop: spacing.xs },
  hint: { color: colors.textSecondary, fontSize: type.caption.fontSize, marginTop: spacing.xs },
});
