import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients, radius, shadow, spacing, type } from '../constants/theme';

export interface TabItem {
  key: string;
  /** Nama route di Tabs (state.routes[x].name) — sumber kebenaran status aktif. */
  routeName: string;
  label: string;
  icon: Extract<keyof typeof Ionicons.glyphMap, string>;
  href: string;
  isCenter?: boolean;
}

interface FloatingTabBarProps {
  tabs: TabItem[];
  activeRouteName: string;
  onSelect: (href: string) => void;
}

// Floating navbar — pill gelap mengambang; ikon aktif memantul (spring) saat berganti.
export function FloatingTabBar({ tabs, activeRouteName, onSelect }: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const glow = useSharedValue(0);
  const centerGlow = useCenterGlow(glow);

  const center = tabs.find((tab) => tab.isCenter);
  const sides = tabs.filter((tab) => !tab.isCenter);

  const renderItem = (tab: TabItem) => {
    const active = activeRouteName === tab.routeName;
    return (
      <Pressable
        key={tab.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          onSelect(tab.href);
        }}
        style={styles.item}
      >
        <View style={[styles.itemInner, active && styles.itemActiveBg]}>
          <TabIcon name={tab.icon} active={active} />
          <Text style={[styles.itemLabel, active && styles.itemLabelActive]}>{tab.label}</Text>
        </View>
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
            onPressIn={() => {
              glow.value = withSpring(1);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            }}
            onPressOut={() => (glow.value = withSpring(0))}
            onPress={() => onSelect(center.href)}
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

// Ikon aktif memantul sekali (spring scale) — feedback gerak tanpa biaya besar.
function TabIcon({ name, active }: { name: string; active: boolean }) {
  const scale = useSharedValue(1);
  const previous = useSharedValue(active);
  if (previous.value !== active) {
    previous.value = active;
    if (active) {
      scale.value = 0.6;
      scale.value = withSpring(1.15, { damping: 6 });
    }
  }
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const filled = (active ? name.replace(/-outline$/, '') : name) as Extract<keyof typeof Ionicons.glyphMap, string>;
  return (
    <Animated.View style={style}>
      <Ionicons name={filled} size={20} color={active ? colors.primary300 : 'rgba(255,255,255,0.65)'} />
    </Animated.View>
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
  itemActiveBg: { backgroundColor: 'rgba(22,163,116,0.22)' },
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
