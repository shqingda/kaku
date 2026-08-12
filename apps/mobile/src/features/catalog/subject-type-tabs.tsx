import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { COLORS, MIN_TOUCH_SIZE } from '@/constants/design';

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
      accessibilityRole="tablist"
      contentContainerStyle={[styles.tabs, contentContainerStyle]}
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
    >
      {types.map((type) => {
        const isSelected = type.id === selectedType;

        return (
          <Pressable
            accessibilityLabel={`${type.label}分类`}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            hitSlop={{ bottom: 4, top: 4 }}
            key={type.id}
            onPress={() => onChange(type.id)}
            style={[styles.tab, isSelected && styles.selectedTab]}
          >
            <Text
              maxFontSizeMultiplier={1.3}
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
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderCurve: 'continuous',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: 14,
  },
  selectedTab: { backgroundColor: COLORS.ink },
  tabText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  selectedTabText: { color: COLORS.surface },
});
