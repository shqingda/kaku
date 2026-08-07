import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { COLORS } from '@/constants/design';

import { SUBJECT_TYPES } from './subject-types';

export function SubjectTypeTabs({
  contentContainerStyle,
  onChange,
  selectedType,
  types = SUBJECT_TYPES,
}: {
  contentContainerStyle?: StyleProp<ViewStyle>;
  onChange: (subjectType: number) => void;
  selectedType: number;
  types?: ReadonlyArray<{ id: number; label: string }>;
}) {
  return (
    <ScrollView
      contentContainerStyle={[styles.tabs, contentContainerStyle]}
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
    >
      {types.map((type) => {
        const isSelected = type.id === selectedType;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            hitSlop={{ bottom: 4, top: 4 }}
            key={type.id}
            onPress={() => onChange(type.id)}
            style={[styles.tab, isSelected && styles.selectedTab]}
          >
            <Text
              style={[styles.tabText, isSelected && styles.selectedTabText]}
            >
              {type.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabs: { gap: 8 },
  tab: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  selectedTab: { backgroundColor: COLORS.ink },
  tabText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  selectedTabText: { color: COLORS.surface },
});
