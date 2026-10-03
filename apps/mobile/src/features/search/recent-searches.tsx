import { HIT_SLOP, MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import { HistoryLocalNotice, type HistoryLocalFeedback } from '@/features/history/history-local-notice';
import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';

export function RecentSearches({
  items,
  history,
  onClear,
  onSelect,
}: {
  items: string[];
  history: HistoryLocalFeedback;
  onClear: () => void;
  onSelect: (keyword: string) => void;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);

  if (!items.length && history.localStatus === 'ready') return null;
  const clearDisabled = history.isClearing || history.localStatus === 'loading' || history.localStatus === 'read-error';

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text style={styles.title}>最近搜索</Text>
        <Pressable
          accessibilityLabel="清除最近搜索"
          accessibilityRole="button"
          hitSlop={HIT_SLOP}
          disabled={clearDisabled}
          accessibilityState={{ disabled: clearDisabled, busy: history.isClearing }}
          onPress={onClear}
          style={({ pressed }) => [styles.clearButton, pressed && styles.pressed, clearDisabled && styles.disabled]}
        >
          <Text style={styles.clear}>{history.isClearing ? '正在清除…' : '清除'}</Text>
        </Pressable>
      </View>
      <HistoryLocalNotice label="搜索历史" history={history} />
      <ScrollView
        contentContainerStyle={styles.list}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {items.map((item) => (
          <Pressable
            accessibilityLabel={`搜索${item}`}
            accessibilityRole="button"
            key={item}
            onPress={() => onSelect(item)}
            style={({ pressed }) => [
              styles.item,
              pressed && styles.itemPressed,
            ]}
          >
            <Text numberOfLines={1} style={styles.itemText}>
              {item}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: { paddingBottom: SPACING.xl, paddingTop: SPACING.lg },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  title: { flexShrink: 1, color: colors.ink, ...TYPE.caption, fontWeight: '700' },
  clear: { color: colors.muted, ...TYPE.caption, fontWeight: '600' },
  list: { gap: SPACING.sm, paddingRight: SPACING.xl, paddingTop: SPACING.md },
  item: {
    backgroundColor: colors.surface,
    borderCurve: 'continuous',
    borderRadius: 13,
    justifyContent: 'center',
    minHeight: MIN_TOUCH_SIZE,
    maxWidth: 180,
    paddingHorizontal: SPACING.lg,
  },
  itemPressed: { backgroundColor: colors.accentSoft },
  itemText: { color: colors.ink, ...TYPE.caption, fontWeight: '600' },
  clearButton: { minHeight: MIN_TOUCH_SIZE, minWidth: MIN_TOUCH_SIZE, justifyContent: 'center', alignItems: 'center' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.6 },
});
