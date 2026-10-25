import { StyleSheet } from 'react-native';
import { MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';

export const createSettingsStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { backgroundColor: colors.background, flex: 1 },
    content: { paddingBottom: SPACING.xxl, paddingHorizontal: SPACING.xl, paddingTop: SPACING.sm },
    sectionTitle: {
      color: colors.muted,
      fontSize: TYPE.caption.fontSize,
      fontWeight: '600',
      letterSpacing: TYPE.caption.letterSpacing,
      marginBottom: SPACING.sm,
      marginTop: SPACING.xxl,
      paddingHorizontal: SPACING.lg,
    },
    firstSectionTitle: { marginTop: SPACING.md },
    group: {
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 20,
      paddingHorizontal: SPACING.lg,
    },
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: SPACING.lg,
      paddingVertical: SPACING.lg,
    },
    rowDivider: {
      borderTopColor: colors.track,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    rowCopy: { flex: 1, minWidth: 0, paddingRight: SPACING.xs },
    rowTitle: {
      color: colors.ink,
      fontSize: TYPE.heading.fontSize,
      fontWeight: '600',
      letterSpacing: TYPE.heading.letterSpacing,
      lineHeight: TYPE.heading.lineHeight,
    },
    rowTitleSelected: { color: colors.accent },
    rowDescription: {
      color: colors.subtle,
      fontSize: TYPE.caption.fontSize,
      letterSpacing: TYPE.caption.letterSpacing,
      lineHeight: TYPE.caption.lineHeight,
      marginTop: SPACING.xs,
    },
    rowAction: {
      color: colors.accent,
      fontSize: TYPE.body.fontSize,
      fontWeight: '600',
    },
    syncBlock: { paddingBottom: SPACING.lg, paddingTop: SPACING.lg },
    syncHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    statusList: {
      alignItems: 'stretch',
      gap: SPACING.md,
      marginTop: SPACING.md,
    },
    statusRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: SPACING.sm,
      minHeight: MIN_TOUCH_SIZE,
    },
    statusLabel: {
      flex: 1,
      color: colors.subtle,
      fontSize: TYPE.caption.fontSize,
      letterSpacing: TYPE.caption.letterSpacing,
      lineHeight: TYPE.caption.lineHeight,
    },
    pressed: { opacity: 0.62 },
    localNotice: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  });

export type SettingsStyles = ReturnType<typeof createSettingsStyles>;
