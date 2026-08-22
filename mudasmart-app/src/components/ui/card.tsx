import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors, radius, shadow } from '../../constants/theme';

// Permukaan kartu: bayangan lembut tanpa border ganda (elevasi dideklarasikan sekali).
export function Card({ children, style, ...rest }: ViewProps & { children: React.ReactNode }) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: 16,
    ...shadow.card,
  },
});
