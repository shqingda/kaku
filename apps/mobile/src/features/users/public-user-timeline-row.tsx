import { Pressable, StyleSheet, Text } from 'react-native';

import { COLORS } from '@/constants/design';
import { formatActivityTime } from '@/lib/format-activity-time';

import type { PublicTimelineItem } from './model';

export function PublicUserTimelineRow({
  hasDivider,
  item,
  onPress,
}: {
  hasDivider?: boolean;
  item: PublicTimelineItem;
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
      <Text style={styles.meta}>{formatActivityTime(item.createdAt)}</Text>
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
  meta: { color: COLORS.subtle, fontSize: 11, marginTop: 8 },
  pressed: { opacity: 0.62 },
});
