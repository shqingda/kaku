import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';

export function ProfileSectionHeader({
  title,
  meta,
  action,
}: {
  title: string;
  meta?: string;
  action?: ReactNode;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionRight}>
        {meta ? <Text style={styles.sectionMeta}>{meta}</Text> : null}
        {action}
      </View>
    </View>
  );
}

export function profileSectionMeta(
  isPending: boolean,
  isError: boolean,
  count: number,
  total?: number,
  prefix = '',
) {
  if (isPending) {
    return '读取中';
  }

  if (isError) {
    return '暂不可用';
  }

  return `${prefix}${count} / ${total ?? count}`;
}

export function ProfileSectionStatus({
  emptyText,
  isError,
  isPending,
  onRetry,
}: {
  emptyText: string;
  isError: boolean;
  isPending: boolean;
  onRetry: () => void;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);

  if (isPending) {
    return <Text style={styles.inlineEmpty}>正在读取…</Text>;
  }

  if (isError) {
    return (
      <View style={styles.inlineStatus}>
        <Text style={styles.inlineEmpty}>这一部分暂时读取失败。</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.inlineRetry,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.inlineRetryText}>重试</Text>
        </Pressable>
      </View>
    );
  }

  return <Text style={styles.inlineEmpty}>{emptyText}</Text>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.xs,
    paddingTop: SPACING.xl,
  },
  sectionTitle: { color: colors.ink, ...TYPE.title, fontWeight: '800' },
  sectionMeta: { color: colors.subtle, ...TYPE.micro },
  sectionRight: { alignItems: 'center', flexDirection: 'row' },
  inlineEmpty: {
    color: colors.muted,
    ...TYPE.caption,
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.lg,
  },
  inlineStatus: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inlineRetry: {
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  inlineRetryText: {
    color: colors.accent,
    ...TYPE.micro,
    fontWeight: '700',
  },
  pressed: { opacity: 0.62 },
});
