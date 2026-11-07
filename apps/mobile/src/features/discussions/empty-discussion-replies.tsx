import { StyleSheet, Text, View } from 'react-native';

import { SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';

export function EmptyDiscussionReplies({
  text = 'Bangumi 暂无公开回复。',
}: {
  text?: string;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>还没有回复</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  empty: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    marginBottom: SPACING.md,
    padding: SPACING.xxl,
  },
  emptyTitle: { color: colors.ink, ...TYPE.heading, fontWeight: '700' },
  emptyText: {
    color: colors.muted,
    ...TYPE.caption,
    lineHeight: 20,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});
