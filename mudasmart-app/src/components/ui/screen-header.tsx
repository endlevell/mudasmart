import { StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing, type } from '../../constants/theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
}

// Header gradien seragam untuk semua layar dalam tab (konsistensi dengan beranda/profil).
export function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  return (
    <LinearGradient colors={['#073D2C', '#0B6E4F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  title: { ...type.title, color: colors.textInverse },
  subtitle: { ...type.caption, color: 'rgba(255,255,255,0.75)', marginTop: spacing.xs },
});
