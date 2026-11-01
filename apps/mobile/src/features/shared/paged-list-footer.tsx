import { useEffect } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useIsOffline } from '@/lib/use-connectivity';
import { useTheme } from '@/features/theme/theme-provider';

// Shared by offset- and cursor-based public lists.
export function PagedListFooter({
  hasNextPage,
  isError,
  isFetching,
  isPaused = false,
  loadedCount,
  onRetry,
  total,
}: {
  hasNextPage: boolean;
  isError: boolean;
  isFetching: boolean;
  isPaused?: boolean;
  loadedCount: number;
  onRetry: () => void;
  total?: number;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const isOffline = useIsOffline();
  const showPaused = hasNextPage && (isPaused || isOffline);
  const showError = isError && !showPaused && !isFetching;

  // 页脚通常先显示正常状态，再进入错误；每次错误真正出现时播一次。
  // Android 由 live region 播报，iOS 需要显式通知。
  useEffect(() => {
    if (showError && Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility('后续结果加载失败');
    }
  }, [showError]);

  if (isFetching && !showPaused) {
    return (
      <View accessibilityLiveRegion="polite" style={styles.footer}>
        <ActivityIndicator color={colors.accent} size="small" />
        <Text style={styles.text}>正在加载更多结果</Text>
      </View>
    );
  }

  if (showPaused || showError) {
    return (
      <View
        accessibilityLiveRegion={showError ? 'assertive' : 'polite'}
        accessibilityRole={showError ? 'alert' : undefined}
        style={styles.footer}
      >
        <Text style={styles.text}>
          {showPaused ? '后续结果等待联网' : '后续结果加载失败'}
        </Text>
        {showPaused ? (
          <Text style={styles.offlineText}>已加载的内容仍可查看，恢复连接后可重试。</Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retry,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.retryText}>重试</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View accessibilityLiveRegion="polite" style={styles.footer}>
      <Text style={styles.text}>
        {hasNextPage
          ? total === undefined
            ? `继续上滑加载更多 · 已显示 ${loadedCount} 个结果`
            : `继续上滑加载更多 · 已显示 ${loadedCount.toLocaleString('zh-CN')} / ${total.toLocaleString('zh-CN')}`
          : total === undefined
            ? `已加载全部 ${loadedCount} 个结果`
            : `已显示全部 ${loadedCount.toLocaleString('zh-CN')} 个结果`}
      </Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    footer: {
      alignItems: 'center',
      gap: SPACING.sm,
      justifyContent: 'center',
      minHeight: 58,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
    },
    text: {
      color: colors.subtle,
      ...TYPE.caption,
      textAlign: 'center',
    },
    retry: {
      alignItems: 'center',
      backgroundColor: colors.accentSoft,
      borderRadius: 11,
      justifyContent: 'center',
      minHeight: MIN_TOUCH_SIZE,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
    },
    offlineText: { color: colors.subtle, ...TYPE.micro, textAlign: 'center' },
    retryText: {
      color: colors.accent,
      ...TYPE.caption,
      fontWeight: '800',
    },
    pressed: { opacity: 0.62 },
  });
