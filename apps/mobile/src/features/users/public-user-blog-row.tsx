import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';
import type { PublicUserBlog } from './model';
import { formatActivityTime } from '@/lib/format-activity-time';

export function PublicUserBlogRow({
  hasDivider = false,
  item,
  onPress,
}: {
  hasDivider?: boolean;
  item: PublicUserBlog;
  onPress: () => void;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      accessibilityLabel={`打开日志：${item.title}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        hasDivider && styles.divider,
        pressed && styles.pressed,
      ]}
    >
      <Text numberOfLines={2} style={styles.title}>
        {item.title}
      </Text>
      <Text numberOfLines={2} style={styles.summary}>
        {item.summary || '暂无摘要'}
      </Text>
      <Text style={styles.meta}>
        {formatActivityTime(item.updatedAt)} · {item.replyCount} 回复
      </Text>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: { paddingVertical: 15 },
  divider: {
    borderTopColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  title: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  summary: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  meta: { color: colors.subtle, fontSize: 11, marginTop: 8 },
  pressed: { opacity: 0.62 },
});
