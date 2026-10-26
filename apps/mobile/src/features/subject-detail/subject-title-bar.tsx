import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';

import { SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';
import { useReduceMotion } from '@/lib/use-reduce-motion';

const BAR_HEIGHT = 56;

// 深滚后条目标题随半透明标题条淡入（滚过封面高度即出现），
// 让深处的页面始终回答「我在看哪个条目」。
export function SubjectTitleBar({
  title,
  top,
  visible,
}: {
  title: string;
  top: number;
  visible: boolean;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const reduceMotion = useReduceMotion();
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      duration: reduceMotion ? 0 : 160,
      easing: Easing.out(Easing.cubic),
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [fade, reduceMotion, visible]);

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.bar,
        {
          height: top + BAR_HEIGHT,
          opacity: fade,
          paddingTop: top,
          transform: [
            { translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) },
          ],
        },
      ]}
    >
      <Text numberOfLines={1} style={styles.text}>
        {title}
      </Text>
    </Animated.View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.divider,
    borderBottomWidth: StyleSheet.hairlineWidth,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    // 盖过滚动内容（后置的 ScrollView），又低于三个 zIndex 10 的浮动按钮。
    zIndex: 5,
  },
  text: {
    color: colors.ink,
    ...TYPE.heading,
    fontWeight: '800',
    height: BAR_HEIGHT,
    lineHeight: SPACING.xxl + SPACING.xl,
    marginLeft: SPACING.xxl * 2,
    marginRight: SPACING.xxl * 4 - SPACING.xs,
    textAlign: 'center',
  },
});
