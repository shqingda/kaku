import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/design';
import { formatActivityTime } from '@/lib/format-activity-time';

import type { PublicTimelineItem } from './model';

export function PublicUserTimelineRow({
  hasDivider,
  item,
  onDelete,
  onPress,
}: {
  hasDivider?: boolean;
  item: PublicTimelineItem;
  onDelete?: () => void;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityHint={onPress ? '进入相关条目详情' : undefined}
      accessibilityLabel={item.text}
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        hasDivider && styles.divider,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.text}>
        {item.subjectTitle ? (
          <>
            {item.leadingText}
            <Text style={styles.subjectTitle}>《{item.subjectTitle}》</Text>
            {item.trailingText}
          </>
        ) : (
          item.text
        )}
      </Text>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{formatActivityTime(item.createdAt)}</Text>
        {onDelete ? (
          <Pressable
            accessibilityLabel="删除这条动态"
            accessibilityRole="button"
            hitSlop={8}
            onPress={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.deleteAction}>删除</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 14 },
  divider: {
    borderTopColor: COLORS.track,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  text: { color: COLORS.ink, fontSize: 14, lineHeight: 20 },
  subjectTitle: { color: COLORS.accentRich, fontWeight: '700' },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  meta: { color: COLORS.subtle, fontSize: 11 },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
    minWidth: 44,
    marginRight: -12,
  },
  deleteAction: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.62 },
});
