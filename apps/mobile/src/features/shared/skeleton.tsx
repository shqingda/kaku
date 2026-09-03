import { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';
import { useReduceMotion } from '@/lib/use-reduce-motion';

// 首屏骨架：占位形状 + 缓慢的明暗呼吸，替代空白与转圈，
// 让布局在数据到达前就稳定（加载完成时页面不跳）。
// 减少动态效果时停止呼吸动画，保留静态占位。
export function SkeletonBox({
  borderRadius = 12,
  height,
  width,
}: {
  borderRadius?: number;
  height: number;
  width?: number | `${number}%`;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const reduceMotion = useReduceMotion();
  const shimmer = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(shimmer);
      shimmer.value = 0;
      return;
    }
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(shimmer);
  }, [reduceMotion, shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + 0.25 * shimmer.value,
  }));

  return (
    <Animated.View
      style={[styles.box, animatedStyle, { borderRadius, height, width }]}
    />
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    box: {
      backgroundColor: colors.track,
      flexGrow: 0,
      flexShrink: 0,
    },
  });
