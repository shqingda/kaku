import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';

export type HorizontalBarDatum = {
  id: number | string;
  label: string;
  value: number;
};

export function HorizontalBarChart({
  denominator,
  items,
  onItemPress,
  valueSuffix = '部',
}: {
  denominator: number;
  items: HorizontalBarDatum[];
  onItemPress?: (item: HorizontalBarDatum) => void;
  valueSuffix?: string;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View accessibilityRole="summary">
      {items.map((item, index) => {
        const percentage = denominator > 0 ? (item.value / denominator) * 100 : 0;
        const percentageText = percentage.toLocaleString('zh-CN', {
          maximumFractionDigits: 1,
        });
        const content = (
          <>
            <View style={styles.heading}>
              <Text maxFontSizeMultiplier={1.3} style={styles.label}>
                {item.label}
              </Text>
              <Text selectable style={styles.value}>
                {item.value.toLocaleString('zh-CN')} {valueSuffix} · {percentageText}%
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.min(percentage, 100)}%` }]} />
            </View>
          </>
        );
        const rowStyle = [styles.row, index > 0 && styles.divider];

        return onItemPress ? (
          <Pressable
            accessibilityHint={`打开${item.label}列表`}
            accessibilityLabel={`${item.label}，${item.value} ${valueSuffix}，占 ${percentageText}%`}
            accessibilityRole="button"
            key={item.id}
            onPress={() => onItemPress(item)}
            style={({ pressed }) => [rowStyle, pressed && styles.pressed]}
          >
            {content}
          </Pressable>
        ) : (
          <View
            accessibilityLabel={`${item.label}，${item.value} ${valueSuffix}，占 ${percentageText}%`}
            accessible
            key={item.id}
            style={rowStyle}
          >
            {content}
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: {
    justifyContent: 'center',
    minHeight: 72,
    paddingVertical: 13,
  },
  divider: {
    borderTopColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  label: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  value: {
    color: colors.subtle,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  track: {
    backgroundColor: colors.track,
    borderCurve: 'continuous',
    borderRadius: 4,
    height: 8,
    marginTop: 12,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: colors.accent,
    borderCurve: 'continuous',
    borderRadius: 4,
    height: '100%',
    minWidth: 0,
  },
  pressed: { opacity: 0.62 },
});
