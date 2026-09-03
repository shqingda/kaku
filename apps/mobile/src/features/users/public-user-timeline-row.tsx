import { Pressable, StyleSheet, Text } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { BangumiText } from '@/features/shared/bangumi-text';
import { useTheme } from '@/features/theme/theme-provider';
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
  const colors = useTheme();
  const styles = createStyles(colors);

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
      {item.subjectTitle ? (
        <Text style={styles.text}>
          {item.leadingText}
          <Text style={styles.subjectTitle}>《{item.subjectTitle}》</Text>
          {item.trailingText}
        </Text>
      ) : (
        <BangumiText style={styles.text}>{item.text}</BangumiText>
      )}
      <Text style={styles.meta}>{formatActivityTime(item.createdAt)}</Text>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: { paddingVertical: 14 },
  divider: {
    borderTopColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  text: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  subjectTitle: { color: colors.accentRich, fontWeight: '700' },
  meta: { color: colors.subtle, fontSize: 11, marginTop: 8 },
  pressed: { opacity: 0.62 },
});
