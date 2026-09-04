import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { useTheme } from '@/features/theme/theme-provider';
import { playSelectionHaptic } from '@/lib/haptics';
import { useReduceMotion } from '@/lib/use-reduce-motion';

function getTransitionDuration(
  reduceMotion: boolean,
  variant: 'icon' | 'pill',
  visible: boolean,
) {
  if (reduceMotion) return 0;
  if (variant === 'pill') return visible ? 200 : 160;
  return visible ? 160 : 120;
}

export function ScrollToTopButton({
  bottom = 24,
  onPress,
  variant = 'icon',
  visible,
}: {
  bottom?: number;
  onPress: () => void;
  variant?: 'icon' | 'pill';
  visible: boolean;
}) {
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const colors = useTheme();
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    Animated.timing(progress, {
      duration: getTransitionDuration(reduceMotion, variant, visible),
      easing: Easing.out(Easing.cubic),
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [progress, reduceMotion, visible]);

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.container,
        variant === 'pill' ? styles.pillContainer : styles.iconContainer,
        {
          bottom: variant === 'pill' ? 28 : bottom,
          opacity: progress,
          transform: [
            variant === 'pill'
              ? {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                }
              : {
                  scale: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.92, 1],
                  }),
                },
          ],
        },
      ]}
    >
      <Pressable
        accessibilityLabel="回到顶部"
        accessibilityRole="button"
        accessibilityHint="滚动到当前列表顶部"
        hitSlop={8}
        onPress={() => {
          playSelectionHaptic();
          onPress();
        }}
        style={({ pressed }) => [
          styles.button,
          variant === 'pill' ? styles.pill : styles.icon,
          { backgroundColor: colors.surface },
          pressed && styles.pressed,
        ]}
      >
        <SymbolView
          name={{ android: 'arrow_upward', ios: 'arrow.up', web: 'arrow_upward' }}
          size={variant === 'pill' ? 15 : 18}
          tintColor={colors.ink}
          weight="semibold"
        />
        {variant === 'pill' ? (
          <Text style={[styles.label, { color: colors.ink }]}>回到顶部</Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 20,
  },
  iconContainer: { right: 20 },
  pillContainer: { alignItems: 'center', left: 0, right: 0 },
  button: {
    alignItems: 'center',
    borderColor:
      Platform.OS === 'android'
        ? 'rgba(29, 29, 31, 0.14)'
        : 'rgba(29, 29, 31, 0.08)',
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: 'center',
    elevation: Platform.OS === 'android' ? 8 : 0,
    shadowColor: '#000000',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  icon: {
    width: 44,
  },
  pill: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 18,
  },
  label: { fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.58 },
});
