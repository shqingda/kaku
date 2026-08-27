import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

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
    searchSlot: { paddingHorizontal: 20 },
    pane: { flex: 1 },
    searchOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: colors.background,
      zIndex: 1,
    },
    overviewList: { flex: 1 },
    content: { paddingBottom: 48, paddingHorizontal: 20 },
    searchList: { backgroundColor: colors.background, flex: 1 },
    searchContent: { paddingBottom: 48, paddingHorizontal: 20 },
    exploreEntries: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 18,
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
      paddingHorizontal: 13,
    },
    exploreEntryFeatured: {
      flexBasis: '100%',
      minHeight: 68,
      paddingHorizontal: 16,
    },
    exploreEntryIcon: {
      alignItems: 'center',
      backgroundColor: colors.accentSoft,
      borderRadius: 11,
      height: 34,
      justifyContent: 'center',
      width: 34,
    },
    exploreEntryText: { flex: 1, marginLeft: 10, minWidth: 0, paddingRight: 5 },
    exploreEntryTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
    exploreEntryMeta: { color: colors.muted, fontSize: 11, marginTop: 3 },
    searchBar: {
      marginTop: 14,
    },
    subjectTypeTabs: { paddingBottom: 2, paddingTop: 12 },
    sectionHeader: {
      alignItems: 'flex-end',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingBottom: 16,
      paddingTop: 30,
    },
    sectionTitle: {
      color: colors.ink,
      fontSize: 26,
      fontWeight: '800',
      letterSpacing: -0.6,
    },
    sectionMeta: { color: colors.muted, fontSize: 13, marginTop: 5 },
    dayTabs: { gap: 8, paddingBottom: 18 },
    dayTab: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    dayTabSelected: { backgroundColor: colors.accentSoft },
    dayTabText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
    dayTabTextSelected: { color: colors.accent },
    calendarList: { gap: 14, paddingRight: 20 },
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
    coverFallback: { color: colors.subtle, fontSize: 20, fontWeight: '700' },
    calendarTitle: {
      color: colors.ink,
      fontSize: 14,
      fontWeight: '700',
      minHeight: 38,
      lineHeight: 19,
      marginTop: 9,
    },
    calendarMeta: { color: colors.subtle, fontSize: 11, marginTop: 5 },
    resultItem: {
      backgroundColor: colors.surface,
      overflow: 'hidden',
      paddingHorizontal: 16,
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
      paddingHorizontal: 16,
    },
    resultRow: {
      alignItems: 'center',
      flexDirection: 'row',
      minHeight: 112,
      paddingVertical: 11,
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
    resultMain: { flex: 1, marginLeft: 14 },
    resultTitle: {
      color: colors.ink,
      fontSize: 16,
      fontWeight: '700',
      lineHeight: 21,
    },
    resultMeta: { color: colors.subtle, fontSize: 12, marginTop: 7 },
    chevron: { color: colors.subtle, fontSize: 26, marginLeft: 8 },
    pressed: { opacity: 0.62 },
  });
