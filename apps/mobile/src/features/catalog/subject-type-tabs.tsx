import { useEffect, useMemo, useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';
import { playSelectionHaptic } from '@/lib/haptics';
import { useReduceMotion } from '@/lib/use-reduce-motion';

import { SUBJECT_TYPES } from './subject-types';

const INDICATOR_SPRING = { damping: 30, mass: 0.8, stiffness: 400 };

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
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const reduceMotion = useReduceMotion();
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const layouts = useRef(new Map<number, { x: number; width: number }>());
  const selectedLabel =
    types.find((type) => type.id === selectedType)?.label ?? '';

  function measureTab(typeId: number, x: number, width: number) {
    layouts.current.set(typeId, { x, width });
    if (typeId === selectedType) {
      indicatorX.value = x;
      indicatorWidth.value = width;
    }
  }

  useEffect(() => {
    const layout = layouts.current.get(selectedType);
    if (!layout) {
      return;
    }
    if (reduceMotion) {
      indicatorX.value = layout.x;
      indicatorWidth.value = layout.width;
      return;
    }
    indicatorX.value = withSpring(layout.x, INDICATOR_SPRING);
    indicatorWidth.value = withSpring(layout.width, INDICATOR_SPRING);
  }, [reduceMotion, selectedType]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
  }));

  return (
    <ScrollView
      accessibilityRole="tablist"
      contentContainerStyle={contentContainerStyle}
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
    >
      <View style={styles.track}>
        {types.map((type) => {
          const isSelected = type.id === selectedType;

          return (
            <Pressable
              accessibilityLabel={`${type.label}分类`}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              hitSlop={{ bottom: 5, top: 5 }}
              key={type.id}
              onLayout={(event) =>
                measureTab(
                  type.id,
                  event.nativeEvent.layout.x,
                  event.nativeEvent.layout.width,
                )
              }
              onPress={() => {
                playSelectionHaptic();
                onChange(type.id);
              }}
              style={styles.tab}
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
        {/* 滑动胶囊盖在白底 pill 上，胶囊内单独渲染选中的文字，避免被盖住。 */}
        <Animated.View
          pointerEvents="none"
          style={[styles.indicator, indicatorStyle]}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.selectedTabText}>
            {selectedLabel}
          </Text>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  track: { flexDirection: 'row', gap: 8 },
  indicator: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderCurve: 'continuous',
    borderRadius: 12,
    bottom: 0,
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
  },
  tab: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderCurve: 'continuous',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 14,
  },
  tabText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  selectedTabText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '700',
  },
});
