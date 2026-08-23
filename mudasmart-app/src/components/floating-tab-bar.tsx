import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients, radius, shadow, spacing, type } from '../constants/theme';

export interface TabItem {
  key: string;
  label: string;
  icon: Extract<keyof typeof Ionicons.glyphMap, string>;
  href: string;
  isCenter?: boolean;
}

interface FloatingTabBarProps {
  tabs: TabItem[];
  activeKey: string;
  onSelect: (href: string) => void;
}

// Floating navbar — pill gelap mengambang, indikator aktif animasi spring,
// item tengah (opsional) berupa tombol gradien terangkat (untuk Scan).
export function FloatingTabBar({ tabs, activeKey, onSelect }: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const glow = useSharedValue(0);

  const center = tabs.find((tab) => tab.isCenter);
  const sides = tabs.filter((tab) => !tab.isCenter);
  const centerGlow = useCenterGlow(glow);

  const renderItem = (tab: TabItem) => {
    const active = activeKey === tab.key;
    return (
      <Pressable
        key={tab.key}
        accessibilityRole="tab"
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          onSelect(tab.href);
        }}
        style={styles.item}
      >
        <Animated.View style={[styles.itemInner, active && styles.itemActive]}>
          <Ionicons name={active ? (tab.icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap) : tab.icon} size={20} color={active ? colors.primary300 : 'rgba(255,255,255,0.65)'} />
          <Text style={[styles.itemLabel, active && styles.itemLabelActive]}>{tab.label}</Text>
        </Animated.View>
      </Pressable>
    );
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { bottom: insets.bottom + 12 }]}>
      <View style={[styles.bar, shadow.floating]}>
        {sides.slice(0, Math.ceil(sides.length / 2)).map(renderItem)}
        {center ? (
          <Pressable
            accessibilityRole="button"
            onPressIn={() => (glow.value = withSpring(1))}
            onPressOut={() => (glow.value = withSpring(0))}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              onSelect(center.href);
            }}
            style={styles.centerWrap}
          >
            <Animated.View style={[styles.centerButton, centerGlow]} pointerEvents="none">
              <LinearGradient colors={gradients.fresh} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.centerGradient}>
                <Ionicons name="scan" size={24} color={colors.textInverse} />
              </LinearGradient>
            </Animated.View>
            <Text style={[styles.itemLabel, styles.centerLabel]}>{center.label}</Text>
          </Pressable>
        ) : null}
        {sides.slice(Math.ceil(sides.length / 2)).map(renderItem)}
      </View>
    </View>
  );
}

// Glow membesar saat jari menyentuh tombol tengah.
function useCenterGlow(value: SharedValue<number>) {
  return useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(1 + value.value * 0.08) }],
    shadowOpacity: 0.35 + value.value * 0.25,
  }));
}

const styles = StyleSheet.create({
  wrapper: { left: spacing.lg, position: 'absolute', right: spacing.lg },
  bar: {
    backgroundColor: colors.primary900,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(111,203,163,0.18)',
  },
  item: { flex: 1 },
  itemInner: { alignItems: 'center', borderRadius: radius.full, gap: 2, paddingHorizontal: spacing.xs, paddingVertical: 6 },
  itemActive: { backgroundColor: 'rgba(22,163,116,0.22)' },
  itemLabel: { ...type.caption, color: 'rgba(255,255,255,0.65)', fontSize: 10 },
  itemLabelActive: { color: colors.primary300, fontWeight: '700' },
  centerWrap: { alignItems: 'center', marginTop: -34, flex: 1 },
  centerButton: {
    borderRadius: radius.full,
    ...shadow.floating,
    shadowColor: colors.primary500,
  },
  centerGradient: { alignItems: 'center', borderRadius: radius.full, height: 56, justifyContent: 'center', width: 56 },
  centerLabel: { color: colors.primary300, fontWeight: '700', marginTop: 4 },
});
