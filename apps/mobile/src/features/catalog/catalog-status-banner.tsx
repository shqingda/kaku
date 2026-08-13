import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';

type CatalogStatusBannerProps = {
  isError: boolean;
  isPending: boolean;
  isRefreshing: boolean;
  onRetry: () => void;
};

export function CatalogStatusBanner({
  isError,
  isPending,
  isRefreshing,
  onRetry,
}: CatalogStatusBannerProps) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!isError && !isPending && !isRefreshing) {
    return null;
  }

  return (
    <View style={[styles.banner, isError && styles.errorBanner]}>
      <View style={styles.copy}>
        <Text style={styles.title}>
          {isError
            ? 'Bangumi 数据暂时加载失败'
            : isPending
              ? '正在读取 Bangumi 最新资料…'
              : '正在更新 Bangumi 资料…'}
        </Text>
        {isError ? (
          <Text style={styles.detail}>当前继续显示本地缓存，不会白屏。</Text>
        ) : null}
      </View>
      {isError ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
        >
          <Text style={styles.retryText}>重试</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    flexDirection: 'row',
    marginBottom: 14,
    padding: 14,
  },
  errorBanner: { backgroundColor: colors.accentSoft },
  copy: { flex: 1 },
  title: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  detail: { color: colors.muted, fontSize: 11, marginTop: 4 },
  retry: {
    backgroundColor: colors.surface,
    borderRadius: 11,
    marginLeft: 12,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  retryText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.6 },
});
