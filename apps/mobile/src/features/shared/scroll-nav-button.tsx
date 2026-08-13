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
import { useReduceMotion } from '@/lib/use-reduce-motion';

// 底部居中的胶囊导航按钮：根据 direction 显示"回到顶部"（上）或"拉到底部"（下），
// 图标 + 文字，上滑淡入 / 下滑淡出的自然过渡。
export function ScrollNavButton({
  direction,
  onPress,
  visible,
}: {
  direction: 'down' | 'up';
  onPress: () => void;
  visible: boolean;
}) {
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const colors = useTheme();
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    Animated.timing(progress, {
      duration: reduceMotion ? 0 : visible ? 200 : 160,
      easing: Easing.out(Easing.cubic),
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [progress, reduceMotion, visible]);

  const isUp = direction === 'up';

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.container,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Pressable
        accessibilityLabel={isUp ? '回到顶部' : '拉到底部'}
        accessibilityRole="button"
        hitSlop={8}
        onPress={onPress}
        style={({ pressed }) => [
          styles.pill,
          { backgroundColor: colors.surface },
          pressed && styles.pressed,
        ]}
      >
        <SymbolView
          name={
            isUp
              ? { android: 'arrow_upward', ios: 'arrow.up', web: 'arrow_upward' }
              : {
                  android: 'arrow_downward',
                  ios: 'arrow.down',
                  web: 'arrow_downward',
                }
          }
          size={15}
          tintColor={colors.ink}
          weight="semibold"
        />
        <Text style={[styles.label, { color: colors.ink }]}>
          {isUp ? '回到顶部' : '拉到底部'}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    bottom: 28,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 20,
  },
  pill: {
    alignItems: 'center',
    borderColor:
      Platform.OS === 'android'
        ? 'rgba(29, 29, 31, 0.14)'
        : 'rgba(29, 29, 31, 0.08)',
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: Platform.OS === 'android' ? 8 : 0,
    flexDirection: 'row',
    gap: 6,
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 18,
    shadowColor: '#000000',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  label: { fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.58 },
});
