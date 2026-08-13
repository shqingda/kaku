import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';

export function EmptyDiscussionReplies({
  text = 'Bangumi 暂无公开回复。',
}: {
  text?: string;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
    marginBottom: 10,
    padding: 28,
  },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
  },
});
