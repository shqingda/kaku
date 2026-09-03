import { useEffect, useMemo } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useIsOffline } from '@/lib/use-connectivity';
import { useTheme } from '@/features/theme/theme-provider';

// 统一的空/错误状态：加载失败、空列表、无网络等都通过它呈现。
// 失败永不隐藏在空白背后：标题 + 说明 + 显式重试按钮。
export function AppState({
  action,
  actionAccessibilityLabel,
  actionLabel = '重试',
  text,
  title,
}: {
  action?: () => void;
  // 按钮可见文字固定用 actionLabel（默认「重试」）；
  // 屏幕想给读屏用户更具体的提示时传 actionAccessibilityLabel。
  actionAccessibilityLabel?: string;
  actionLabel?: string;
  text: string;
  title: string;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isOffline = useIsOffline();
  const isError = Boolean(action);

  // iOS 没有等价于 accessibilityLiveRegion 的自动播报；错误出现时手动播一次，
  // 依赖保持空数组（title/text 在卡片出现时已确定）。
  useEffect(() => {
    if (isError) {
      AccessibilityInfo.announceForAccessibility(`${title}，${text}`);
    }
  }, []);

  return (
    <Animated.View
      accessibilityLiveRegion={isError ? 'assertive' : 'polite'}
      accessibilityRole={isError ? 'alert' : undefined}
      entering={FadeIn.duration(200)}
      style={styles.state}
    >
      <Text accessibilityRole="header" style={styles.stateTitle}>
        {title}
      </Text>
      <Text style={styles.stateText}>{text}</Text>
      {isOffline && isError ? (
        <Text accessibilityRole="text" style={styles.offlineText}>
          当前离线：联网后将自动恢复重试能力。
        </Text>
      ) : null}
      {action ? (
        <Pressable
          accessibilityLabel={actionAccessibilityLabel ?? actionLabel}
          accessibilityRole="button"
          onPress={action}
          style={({ pressed }) => [
            styles.retry,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.retryText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    state: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: SPACING.xxl - 2,
    },
    stateTitle: { color: colors.ink, ...TYPE.heading },
    stateText: {
      color: colors.muted,
      ...TYPE.caption,
      lineHeight: 20,
      marginTop: SPACING.sm - 1,
      textAlign: 'center',
    },
    offlineText: {
      color: colors.subtle,
      fontSize: 11,
      lineHeight: 15,
      marginTop: SPACING.xs,
      textAlign: 'center',
    },
    retry: {
      backgroundColor: colors.accentSoft,
      borderRadius: 13,
      marginTop: SPACING.lg - 1,
      paddingHorizontal: 17,
      paddingVertical: 9,
    },
    retryText: { color: colors.accent, ...TYPE.caption, fontWeight: '800' },
    pressed: { opacity: 0.62 },
  });
