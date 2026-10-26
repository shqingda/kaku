import { StyleSheet, Text, View } from 'react-native';

import { SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { ExpandableText } from '@/features/shared/expandable-text';
import { useTheme } from '@/features/theme/theme-provider';

// 超过 100 字才折叠，短简介直接完整显示。
const COLLAPSE_THRESHOLD = 100;

export function SubjectSummaryPanel({ summary }: { summary: string }) {
  const colors = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>简介</Text>
      {summary.length > COLLAPSE_THRESHOLD ? (
        <ExpandableText
          noun="简介"
          style={styles.summary}
          text={summary}
          toggleLabelStyle={styles.toggle}
        />
      ) : (
        <Text style={styles.summary}>{summary}</Text>
      )}
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
  summary: { color: colors.muted, ...TYPE.body, lineHeight: TYPE.heading.lineHeight, marginTop: SPACING.md },
  toggle: {
    alignSelf: 'flex-start',
    color: colors.accent,
    ...TYPE.caption,
    fontWeight: '700',
    marginTop: SPACING.sm,
  },
});
