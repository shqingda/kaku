import { useEffect, useMemo } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useIsOffline } from '@/lib/use-connectivity';
import { useTheme } from '@/features/theme/theme-provider';

// Shared by offset- and cursor-based public lists.
export function PagedListFooter({
  hasNextPage,
  isError,
  isFetching,
  loadedCount,
  onRetry,
  total,
}: {
  hasNextPage: boolean;
  isError: boolean;
  isFetching: boolean;
  loadedCount: number;
  onRetry: () => void;
  total?: number;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isOffline = useIsOffline();

  // iOS 无自动播报：加载更多失败出现时手动播一次（依赖保持空数组）。
  useEffect(() => {
    if (isError) {
      AccessibilityInfo.announceForAccessibility('后续结果加载失败');
    }
  }, []);

  if (isFetching) {
    return (
      <View accessibilityLiveRegion="polite" style={styles.footer}>
        <ActivityIndicator color={colors.accent} size="small" />
        <Text style={styles.text}>正在加载更多结果</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View accessibilityRole="alert" style={styles.footer}>
        <Text style={styles.text}>后续结果加载失败</Text>
        {isOffline ? (
          <Text style={styles.offlineText}>离线中，联网后可重试</Text>
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
      flexDirection: 'row',
      gap: 9,
      justifyContent: 'center',
      minHeight: 58,
      paddingHorizontal: 16,
    },
    text: {
      color: colors.subtle,
      fontSize: 12,
      textAlign: 'center',
    },
    retry: {
      alignItems: 'center',
      backgroundColor: colors.accentSoft,
      borderRadius: 11,
      justifyContent: 'center',
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    offlineText: { color: colors.subtle, fontSize: 11 },
    retryText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '800',
    },
    pressed: { opacity: 0.62 },
  });
