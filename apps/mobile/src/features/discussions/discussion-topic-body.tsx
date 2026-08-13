import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { BangumiText } from '@/features/shared/bangumi-text';
import { useTheme } from '@/features/theme/theme-provider';

export function DiscussionTopicBody({ body }: { body?: string }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!body) return null;

  return (
    <View style={styles.card}>
      <BangumiText style={styles.body}>{body}</BangumiText>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    marginBottom: 14,
    padding: 20,
  },
  body: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 24,
  },
});
