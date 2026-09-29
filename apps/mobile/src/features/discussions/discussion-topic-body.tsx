import { SPACING, TYPE } from '@/constants/design';
import { StyleSheet, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { BangumiText } from '@/features/shared/bangumi-text';
import { useTheme } from '@/features/theme/theme-provider';

export function DiscussionTopicBody({ body }: { body?: string }) {
  const colors = useTheme();
  const styles = createStyles(colors);

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
    marginBottom: SPACING.lg,
    padding: SPACING.xl,
  },
  body: {
    color: colors.ink,
    fontSize: TYPE.body.fontSize,
    lineHeight: TYPE.body.lineHeight,
  },
});
