import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { TYPE } from '@/constants/design';
import { ScrollToTopButton } from '@/features/shared/scroll-to-top-button';
import type { ScrollDirectionAction } from '@/features/shared/use-scroll-direction-action';
import { useTheme } from '@/features/theme/theme-provider';
import { useReduceMotion } from '@/lib/use-reduce-motion';

const ICON_SIZE = TYPE.caption.lineHeight;
const UP_ICON = {
  android: 'arrow_upward',
  ios: 'arrow.up',
  web: 'arrow_upward',
} as const;
const DOWN_ICON = {
  android: 'arrow_downward',
  ios: 'arrow.down',
  web: 'arrow_downward',
} as const;

// 底座始终只有一颗：方向变化只交叉淡化两枚常驻图标，不再把整颗按钮收起又弹出。
export function EpisodeScrollActionButton({
  action,
  bottom,
  onBottom,
  onTop,
}: {
  action: ScrollDirectionAction | null;
  bottom: number;
  onBottom: () => void;
  onTop: () => void;
}) {
  const iconProgress = useRef(
    new Animated.Value(action === 'top' ? 1 : 0),
  ).current;
  const colors = useTheme();
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (!action) return;
    const animation = Animated.timing(iconProgress, {
      duration: reduceMotion ? 0 : 220,
      easing: Easing.inOut(Easing.cubic),
      toValue: action === 'top' ? 1 : 0,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [action, iconProgress, reduceMotion]);

  return (
    <ScrollToTopButton
      accessibilityHint={
        action === 'top' ? '滚动到本集评论顶部' : '滚动到本集最新一条回复'
      }
      accessibilityLabel={action === 'top' ? '回到顶部' : '跳到最新回复'}
      bottom={bottom}
      iconContent={
        <Animated.View style={styles.icons}>
          <Animated.View style={[styles.icon, { opacity: iconProgress }]}>
            <SymbolView
              name={UP_ICON}
              size={ICON_SIZE}
              tintColor={colors.ink}
              weight="semibold"
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.icon,
              {
                opacity: iconProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0],
                }),
              },
            ]}
          >
            <SymbolView
              name={DOWN_ICON}
              size={ICON_SIZE}
              tintColor={colors.ink}
              weight="semibold"
            />
          </Animated.View>
        </Animated.View>
      }
      onPress={action === 'top' ? onTop : onBottom}
      visible={action !== null}
    />
  );
}

const styles = StyleSheet.create({
  icons: { height: ICON_SIZE, width: ICON_SIZE },
  icon: StyleSheet.absoluteFill,
});
