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

export function CollectionChoiceTab({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  const colors = useTheme();
  const styles = createCollectionListStyles(colors);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        playSelectionHaptic();
        onPress();
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
}

export const createCollectionListStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { backgroundColor: colors.background, flex: 1 },
    content: {
      paddingBottom: 44,
      paddingHorizontal: 20,
    },
    header: {
      paddingBottom: 18,
      paddingHorizontal: 4,
      paddingTop: 24,
    },
    title: {
      color: colors.ink,
      fontSize: 30,
      fontWeight: '800',
      letterSpacing: -0.8,
    },
    subtitle: {
      color: colors.muted,
      fontSize: 13,
      marginTop: 7,
    },
    searchField: {
      marginBottom: 16,
    },
    subjectTypeTabs: { paddingBottom: 14 },
    statusTabs: { gap: 8, paddingBottom: 14, paddingRight: 20 },
    sortTabs: {
      flexDirection: 'row',
      gap: 8,
      paddingBottom: 18,
    },
    statusTab: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 12,
      justifyContent: 'center',
      minHeight: 36,
      minWidth: 58,
      paddingHorizontal: 14,
    },
    statusTabSelected: { backgroundColor: colors.ink },
    statusTabText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
    statusTabTextSelected: { color: colors.surface },
    item: {
      backgroundColor: colors.surface,
      overflow: 'hidden',
      paddingHorizontal: 14,
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
