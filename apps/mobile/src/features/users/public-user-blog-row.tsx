import { Pressable, StyleSheet, Text } from 'react-native';

import { COLORS } from '@/constants/design';
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

const styles = StyleSheet.create({
  row: { paddingVertical: 15 },
  divider: {
    borderTopColor: COLORS.track,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  title: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  summary: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  meta: { color: COLORS.subtle, fontSize: 11, marginTop: 8 },
  pressed: { opacity: 0.62 },
});
