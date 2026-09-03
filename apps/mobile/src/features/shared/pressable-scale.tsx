import { forwardRef, useCallback } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/lib/use-reduce-motion';

// 按压反馈发生在 pointer-down（apple-design：响应是手感的地基）。
// 弹簧从当前值出发、随时可中断；按住保持缩小，松开弹回。
// 只用于主要可点卡片：普通列表行继续用静态 opacity 反馈即可。
export const PRESS_SCALE = 0.97;
const PRESS_SCALE_SPRING = { damping: 30, mass: 1, stiffness: 420 } as const;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressableScaleProps = PressableProps & {
  style?: StyleProp<ViewStyle>;
};

export const PressableScale = forwardRef<View, PressableScaleProps>(
  function PressableScale({ onPressIn, onPressOut, style, ...props }, ref) {
    const scale = useSharedValue(1);
    const reduceMotion = useReduceMotion();

    const animatedStyle = useAnimatedStyle(() => {
      if (reduceMotion) {
        return {};
      }
      return { transform: [{ scale: scale.value }] };
    });

    const handlePressIn = useCallback(
      (event: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
        scale.value = withSpring(PRESS_SCALE, PRESS_SCALE_SPRING);
        onPressIn?.(event);
      },
      [onPressIn, scale],
    );

    const handlePressOut = useCallback(
      (event: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) => {
        scale.value = withSpring(1, PRESS_SCALE_SPRING);
        onPressOut?.(event);
      },
      [onPressOut, scale],
    );

    return (
      <AnimatedPressable
        {...props}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        ref={ref}
        style={[style, animatedStyle]}
      />
    );
  },
);
