import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';

export function useExploreStyles() {
  const colors = useTheme();
  const styles = useMemo(() => createExploreStyles(colors), [colors]);

  return { colors, styles };
}

export const createExploreStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { backgroundColor: colors.background, flex: 1 },
    body: { backgroundColor: colors.background, flex: 1 },
    pane: { flex: 1 },
    searchOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: colors.background,
      zIndex: 1,
    },
    overviewList: { flex: 1 },
    content: { paddingBottom: SPACING.xl * 2, paddingHorizontal: SPACING.xl },
    searchList: { backgroundColor: colors.background, flex: 1 },
    searchContent: { paddingBottom: SPACING.xl * 2, paddingHorizontal: SPACING.xl },
    exploreEntries: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.md,
      marginTop: SPACING.lg,
    },
    exploreEntry: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 18,
      flexBasis: '47%',
      flexGrow: 1,
      flexDirection: 'row',
      minHeight: 58,
      paddingHorizontal: SPACING.md,
    },
    exploreEntryFeatured: {
      flexBasis: '100%',
      minHeight: 68,
      paddingHorizontal: SPACING.lg,
    },
    exploreEntryIcon: {
      alignItems: 'center',
      backgroundColor: colors.accentSoft,
      borderRadius: 11,
      height: 34,
      justifyContent: 'center',
      width: 34,
    },
    exploreEntryText: { flex: 1, marginLeft: SPACING.md, minWidth: 0, paddingRight: SPACING.xs },
    exploreEntryTitle: { color: colors.ink, fontSize: TYPE.body.fontSize, fontWeight: '800' },
    exploreEntryMeta: { color: colors.muted, fontSize: TYPE.micro.fontSize, marginTop: SPACING.xs },
    searchBar: {
      marginTop: SPACING.lg,
    },
    subjectTypeTabs: { paddingBottom: SPACING.xs, paddingTop: SPACING.md },
    sectionHeader: {
      alignItems: 'flex-end',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingBottom: SPACING.lg,
      paddingTop: SPACING.xxl,
    },
    sectionTitle: {
      color: colors.ink,
      fontSize: TYPE.titleLarge.fontSize,
      fontWeight: '800',
      letterSpacing: TYPE.titleLarge.letterSpacing,
    },
    sectionMeta: { color: colors.muted, fontSize: TYPE.caption.fontSize, marginTop: SPACING.xs },
    dayTabs: { gap: SPACING.sm, paddingBottom: SPACING.lg },
    dayTab: {
      minHeight: MIN_TOUCH_SIZE,
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
    },
    dayTabSelected: { backgroundColor: colors.accentSoft },
    dayTabText: { color: colors.muted, fontSize: TYPE.caption.fontSize, fontWeight: '700' },
    dayTabTextSelected: { color: colors.accent },
    calendarList: { gap: SPACING.lg, paddingRight: SPACING.xl },
    calendarCard: { width: 126 },
    calendarCover: {
      alignItems: 'center',
      backgroundColor: colors.track,
      borderRadius: 18,
      height: 175,
      justifyContent: 'center',
      overflow: 'hidden',
      width: 126,
    },
    coverFallback: { color: colors.subtle, fontSize: TYPE.title.fontSize, fontWeight: '700' },
    calendarTitle: {
      color: colors.ink,
      fontSize: TYPE.body.fontSize,
      fontWeight: '700',
      minHeight: 38,
      lineHeight: TYPE.body.lineHeight,
      marginTop: SPACING.sm,
    },
    calendarMeta: { color: colors.subtle, fontSize: TYPE.micro.fontSize, marginTop: SPACING.xs },
    resultItem: {
      backgroundColor: colors.surface,
      overflow: 'hidden',
      paddingHorizontal: SPACING.lg,
    },
    firstResultItem: {
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
    },
    lastResultItem: {
      borderBottomLeftRadius: 22,
      borderBottomRightRadius: 22,
    },
    rankingList: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      overflow: 'hidden',
      paddingHorizontal: SPACING.lg,
    },
    resultRow: {
      alignItems: 'center',
      flexDirection: 'row',
      minHeight: 112,
      paddingVertical: SPACING.md,
    },
    resultBorder: {
      borderTopColor: colors.divider,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    resultCover: {
      alignItems: 'center',
      backgroundColor: colors.track,
      borderRadius: 11,
      height: 88,
      justifyContent: 'center',
      overflow: 'hidden',
      width: 62,
    },
    resultMain: { flex: 1, marginLeft: SPACING.lg },
    resultTitle: {
      color: colors.ink,
      fontSize: TYPE.heading.fontSize,
      fontWeight: '700',
      lineHeight: TYPE.heading.lineHeight,
    },
    resultMeta: { color: colors.subtle, fontSize: TYPE.caption.fontSize, marginTop: SPACING.sm },
    chevron: { color: colors.subtle, fontSize: TYPE.titleLarge.fontSize, marginLeft: SPACING.sm },
    pressed: { opacity: 0.62 },
  });
