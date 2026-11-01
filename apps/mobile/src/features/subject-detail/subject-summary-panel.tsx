import { StyleSheet, Text, View } from 'react-native';

import { SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { ExpandableText } from '@/features/shared/expandable-text';
import { useTheme } from '@/features/theme/theme-provider';

export function SubjectSummaryPanel({ summary }: { summary: string }) {
  const colors = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>简介</Text>
      <View style={styles.summaryContent}>
        {summary ? (
          <ExpandableText
            noun="简介"
            style={styles.summary}
            text={summary}
            toggleLabelStyle={styles.toggle}
          />
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    marginBottom: SPACING.lg,
    padding: SPACING.lg + SPACING.xs,
  },
  title: { color: colors.ink, ...TYPE.heading, fontWeight: '700' },
  summaryContent: { marginTop: SPACING.md },
  summary: { color: colors.muted, ...TYPE.body, lineHeight: TYPE.heading.lineHeight },
  toggle: {
    alignSelf: 'flex-start',
    color: colors.accent,
    ...TYPE.caption,
    fontWeight: '700',
    marginTop: SPACING.sm,
  },
});
