import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { HIT_SLOP, SPACING, TYPE } from '@/constants/design';
import { useTheme } from '@/features/theme/theme-provider';

type CatalogStatusBannerProps = {
  fromOfflinePack?: boolean;
  isError: boolean;
  isPending: boolean;
  isRefreshing: boolean;
  onRetry: () => void;
};

export function CatalogStatusBanner({
  fromOfflinePack = false,
  isError,
  isPending,
  isRefreshing,
  onRetry,
}: CatalogStatusBannerProps) {
  const colors = useTheme();
  const styles = createStyles(colors);

  if (!isError && !isPending && !isRefreshing && !fromOfflinePack) {
    return null;
  }

  const title = fromOfflinePack
    ? '正在使用离线包中的条目和章节'
    : isError
      ? 'Bangumi 数据暂时加载失败'
      : isPending
        ? '正在读取 Bangumi 最新资料…'
        : '正在更新 Bangumi 资料…';

  return (
    <View style={[styles.banner, (isError || fromOfflinePack) && styles.errorBanner]}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {isError || fromOfflinePack ? (
          <Text style={styles.detail}>
            {fromOfflinePack
              ? '离线包来自最近打开过的条目，最多保留 30 天。点此重试获取最新资料。'
              : '当前继续显示本地缓存，不会白屏。'}
          </Text>
        ) : null}
      </View>
      {isError || fromOfflinePack ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={HIT_SLOP}
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
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
  },
  errorBanner: { backgroundColor: colors.accentSoft },
  copy: { flex: 1 },
  title: { color: colors.ink, ...TYPE.caption, fontWeight: '700' },
  detail: { color: colors.muted, ...TYPE.micro, marginTop: SPACING.xs },
  retry: {
    backgroundColor: colors.surface,
    borderRadius: 11,
    marginLeft: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  retryText: { color: colors.accent, ...TYPE.caption, fontWeight: '700' },
  pressed: { opacity: 0.62 },
});
