import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface PressableScaleProps {
  onPress: () => void;
  children: React.ReactNode;
  style?: any;
  disabled?: boolean;
}

// Pembungkus interaksi standar: scale saat ditekan + haptic ringan.
export function PressableScale({ onPress, children, style, disabled = false }: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => {
        scale.value = withTiming(0.97, { duration: 90 });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }}
      onPressOut={() => (scale.value = withTiming(1, { duration: 140 }))}
      onPress={onPress}
    >
      <Animated.View style={[style, animated]}>{children}</Animated.View>
    </Pressable>
  );
}
