import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/design';

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
  if (isFetching) {
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={COLORS.accent} size="small" />
        <Text style={styles.text}>正在加载更多结果</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.footer}>
        <Text style={styles.text}>后续结果加载失败</Text>
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
    <View style={styles.footer}>
      <Text style={styles.text}>
        {hasNextPage
          ? total === undefined
            ? `继续上滑加载更多 · 已显示 ${loadedCount} 个结果`
            : `继续上滑加载更多 · 已显示 ${loadedCount}/${total}`
          : total === undefined
            ? `已加载全部 ${loadedCount} 个结果`
            : `已显示全部 ${loadedCount} 个结果`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: 16,
  },
  text: {
    color: COLORS.subtle,
    fontSize: 12,
    textAlign: 'center',
  },
  retry: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  retryText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '800',
  },
  pressed: { opacity: 0.62 },
});
