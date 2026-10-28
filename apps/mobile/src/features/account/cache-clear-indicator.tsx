import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useReduceMotion } from '@/lib/use-reduce-motion';

export type CacheClearStatus = 'idle' | 'clearing' | 'success' | 'error';

// 保留右侧位置，转圈与结果在同一位置交接；重试从当前动画值继续。
export function CacheClearIndicator({ status, color }: { status: CacheClearStatus; color: string }) {
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(0);
  const visible = useSharedValue(0);
  const finished = status === 'success' || status === 'error';
  useEffect(() => {
    const result = status === 'clearing' ? 0 : 1;
    const opacity = status === 'idle' ? 0 : 1;
    progress.value = reduceMotion ? result : withSpring(result, { damping: 20, stiffness: 240 });
    visible.value = reduceMotion ? opacity : withSpring(opacity, { damping: 20, stiffness: 240 });
  }, [finished, status, reduceMotion, progress, visible]);
  const containerStyle = useAnimatedStyle(() => ({ opacity: visible.value }));
  const spinnerStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  const resultStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.8 + progress.value * 0.2 }],
  }));

  return (
    <Animated.View style={[styles.frame, containerStyle]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, spinnerStyle]}>
        {status === 'clearing' || finished ? (reduceMotion ? <View style={[styles.staticRing, { borderColor: color }]} /> : <ActivityIndicator size="small" color={color} />) : null}
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, resultStyle]}>
        <SymbolView
          name={status === 'error'
            ? { ios: 'xmark.circle', android: 'error_outline', web: 'error_outline' }
            : { ios: 'checkmark.circle', android: 'check_circle_outline', web: 'check_circle_outline' }}
          size={22}
          tintColor={status === 'error' ? '#FF3B30' : '#34C759'}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  staticRing: { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
  frame: { width: 24, height: 24 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
