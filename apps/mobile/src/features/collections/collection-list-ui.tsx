import { MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import { memo, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import {
  getCollectionStatusLabel,
} from '@/features/catalog/subject-types';
import { PublicUserCollectionRow } from '@/features/users/public-user-collection-row';
import type { PublicUserCollection } from '@/features/users/model';
import { useTheme } from '@/features/theme/theme-provider';
import { playSelectionHaptic } from '@/lib/haptics';
import type { CollectionStatus } from '@/features/watching/model';

export const COLLECTION_STATUS_OPTIONS: Array<CollectionStatus | undefined> = [
  undefined,
  'wish',
  'completed',
  'doing',
  'onHold',
  'dropped',
];

export const CollectionRow = memo(function CollectionRow({
  isFirst,
  isLast,
  item,
  onPressItem,
  trailing,
}: {
  isFirst: boolean;
  isLast: boolean;
  item: PublicUserCollection;
  onPressItem: (id: number) => void;
  trailing?: ReactNode;
}) {
  const colors = useTheme();
  const styles = createCollectionListStyles(colors);

  return (
    <View
      style={[
        styles.item,
        isFirst && styles.firstItem,
        isLast && styles.lastItem,
      ]}
    >
      <PublicUserCollectionRow
        hasDivider={!isFirst}
        item={item}
        onPress={() => onPressItem(item.id)}
        trailing={trailing}
      />
    </View>
  );
});

export function CollectionStatusTabs({
  onChange,
  selectedStatus,
  subjectType,
}: {
  onChange: (status: CollectionStatus | undefined) => void;
  selectedStatus?: CollectionStatus;
  subjectType: number;
}) {
  const colors = useTheme();
  const styles = createCollectionListStyles(colors);

  return (
    <ScrollView
      contentContainerStyle={styles.statusTabs}
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
    >
      {COLLECTION_STATUS_OPTIONS.map((status) => {
        const selected = status === selectedStatus;
        const label = status
          ? getCollectionStatusLabel(subjectType, status)
          : '全部';

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={status ?? 'all'}
            onPress={() => {
              playSelectionHaptic();
              onChange(status);
            }}
            style={({ pressed }) => [
              styles.statusTab,
              selected && styles.statusTabSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.statusTabText,
                selected && styles.statusTabTextSelected,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export const createCollectionListStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { backgroundColor: colors.background, flex: 1 },
    content: {
      paddingBottom: SPACING.xl * 2,
      paddingHorizontal: SPACING.xl,
    },
    header: {
      paddingBottom: SPACING.lg,
      paddingHorizontal: SPACING.xs,
      paddingTop: SPACING.xl,
    },
    title: {
      color: colors.ink,
      fontSize: TYPE.display.fontSize,
      fontWeight: '800',
      letterSpacing: TYPE.display.letterSpacing,
    },
    subtitle: {
      color: colors.muted,
      fontSize: TYPE.caption.fontSize,
      marginTop: SPACING.sm,
    },
    searchField: {
      marginBottom: SPACING.lg,
    },
    subjectTypeTabs: { paddingBottom: SPACING.lg },
    statusTabs: { gap: SPACING.sm, paddingBottom: SPACING.lg, paddingRight: SPACING.xl },
    statusTab: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 12,
      justifyContent: 'center',
      minHeight: MIN_TOUCH_SIZE,
      minWidth: 58,
      paddingHorizontal: SPACING.lg,
    },
    statusTabSelected: { backgroundColor: colors.ink },
    statusTabText: { color: colors.muted, fontSize: TYPE.caption.fontSize, fontWeight: '700' },
    statusTabTextSelected: { color: colors.surface },
    item: {
      backgroundColor: colors.surface,
      overflow: 'hidden',
      paddingHorizontal: SPACING.lg,
    },
    firstItem: {
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
    },
    lastItem: {
      borderBottomLeftRadius: 22,
      borderBottomRightRadius: 22,
    },
    pressed: { opacity: 0.62 },
  });
