import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';

export function DiscussionTopicBody({ body }: { body?: string }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!body) return null;

  return (
    <View style={styles.card}>
      <Text selectable style={styles.body}>
        {body}
      </Text>
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
