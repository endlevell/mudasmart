import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { create } from 'zustand';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, spacing, type } from '../../constants/theme';

type Tone = 'success' | 'warning' | 'danger' | 'info';

interface ToastPayload {
  tone: Tone;
  message: string;
  title?: string;
}

interface ToastItem extends ToastPayload {
  id: number;
}

interface ToastStore {
  toast: ToastItem | null;
  push: (payload: ToastPayload) => void;
  clear: () => void;
}

const useToastStore = create<ToastStore>((set) => ({
  toast: null,
  push: (payload) => set({ toast: { ...payload, id: Date.now() } }),
  clear: () => set({ toast: null }),
}));

// API imperatif — bisa dipanggil dari komponen maupun store tanpa hook.
export const toast = {
  show: (payload: ToastPayload) => useToastStore.getState().push(payload),
};

const tones: Record<Tone, { icon: Extract<keyof typeof Ionicons.glyphMap, string>; fg: string; bg: string }> = {
  success: { icon: 'checkmark', fg: colors.primary700, bg: colors.primary100 },
  warning: { icon: 'warning', fg: '#B45309', bg: colors.warningBg },
  danger: { icon: 'close', fg: colors.danger, bg: colors.dangerBg },
  info: { icon: 'information-circle', fg: colors.info, bg: colors.infoBg },
};

const hapticByTone: Record<Tone, () => void> = {
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
  danger: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
  info: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
};

// Host global — dipasang sekali di root layout; toast muncul center-top dengan
// animasi goyang (wobble) saat mendarat + haptic sesuai tone, auto-hide 3 detik.
export function ToastHost() {
  const insets = useSafeAreaInsets();
  const toastItem = useToastStore((state) => state.toast);
  const clear = useToastStore((state) => state.clear);
  const y = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { rotateZ: `${rotate.value}deg` }],
    opacity: opacity.value,
  }));

  useEffect(() => {
    if (!toastItem) return;
    hapticByTone[toastItem.tone]();

    // Reset lalu masuk dari atas dengan spring; setelah mendarat, goyang kecil.
    y.value = -100;
    opacity.value = 0;
    rotate.value = 0;
    y.value = withSpring(0, { damping: 13, stiffness: 210 });
    opacity.value = withTiming(1, { duration: 140 });
    rotate.value = withDelay(
      150,
      withSequence(
        withTiming(-3.5, { duration: 65, easing: Easing.inOut(Easing.quad) }),
        withTiming(3.5, { duration: 65, easing: Easing.inOut(Easing.quad) }),
        withTiming(-1.5, { duration: 55, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 55 }),
      ),
    );

    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 180 });
      y.value = withTiming(-90, { duration: 220, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished) runOnJS(clear)();
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [toastItem, clear, y, opacity, rotate]);

  if (!toastItem) return null;
  const palette = tones[toastItem.tone];

  return (
    <View pointerEvents="none" style={[styles.host, { top: insets.top + 10 }]}>
      <Animated.View style={[styles.card, cardStyle]}>
        <View style={[styles.iconWrap, { backgroundColor: palette.bg }]}>
          <Ionicons name={palette.icon} size={15} color={palette.fg} />
        </View>
        <View style={styles.textWrap}>
          {toastItem.title ? <Text style={styles.title}>{toastItem.title}</Text> : null}
          <Text numberOfLines={3} style={styles.message}>
            {toastItem.message}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { alignSelf: 'center', left: 0, position: 'absolute', right: 0, alignItems: 'center', zIndex: 999 },
  card: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: 'rgba(11,61,44,0.08)',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm + 2,
    maxWidth: '92%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...shadow.floating,
  },
  iconWrap: { alignItems: 'center', borderRadius: radius.full, height: 32, justifyContent: 'center', width: 32 },
  textWrap: { flex: 1 },
  title: { ...type.bodyStrong, color: colors.textPrimary },
  message: { ...type.caption, color: colors.textSecondary, marginTop: 1 },
});
