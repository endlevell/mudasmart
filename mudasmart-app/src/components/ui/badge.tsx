import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../../constants/theme';

type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

const tones: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: colors.primary100, fg: colors.primary700 },
  warning: { bg: colors.warningBg, fg: '#B45309' },
  danger: { bg: colors.dangerBg, fg: colors.danger },
  neutral: { bg: colors.surfaceMuted, fg: colors.textSecondary },
  info: { bg: colors.infoBg, fg: colors.info },
};

// Status selalu warna + label (aksesibilitas Bagian 4.2).
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const palette = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.text, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  text: { fontSize: 12, fontWeight: '700' },
});
