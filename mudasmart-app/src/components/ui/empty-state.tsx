import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../../constants/theme';

interface EmptyStateProps {
  title: string;
  message?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.mark}>
        <Text style={styles.markText}>—</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  mark: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    height: 56,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 56,
  },
  markText: { color: colors.textSecondary, fontSize: 20 },
  title: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  message: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
});
