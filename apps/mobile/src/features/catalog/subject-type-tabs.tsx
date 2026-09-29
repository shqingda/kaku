import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';
import { playSelectionHaptic } from '@/lib/haptics';

import { SUBJECT_TYPES } from './subject-types';

export function SubjectTypeTabs({
  contentContainerStyle,
  onChange,
  onPressIn,
  selectedType,
  types = SUBJECT_TYPES,
}: {
  contentContainerStyle?: StyleProp<ViewStyle>;
  onChange: (subjectType: number) => void;
  onPressIn?: (subjectType: number) => void;
  selectedType: number;
  types?: ReadonlyArray<{ id: number; label: string }>;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);

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
            hitSlop={{ bottom: 5, top: 5 }}
            key={type.id}
            onPress={() => {
              playSelectionHaptic();
              onChange(type.id);
            }}
            onPressIn={() => onPressIn?.(type.id)}
            style={({ pressed }) => [
              styles.tab,
              isSelected && styles.selectedTab,
              pressed && styles.pressed,
            ]}
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  tabs: { gap: SPACING.sm },
  tab: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderCurve: 'continuous',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: SPACING.lg,
  },
  selectedTab: { backgroundColor: colors.ink },
  pressed: { opacity: 0.6 },
  tabText: {
    color: colors.muted,
    fontSize: TYPE.caption.fontSize,
    fontWeight: '700',
  },
  selectedTabText: { color: colors.surface },
});
