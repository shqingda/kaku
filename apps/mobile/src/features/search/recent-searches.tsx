import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/design';

export function RecentSearches({
  items,
  onClear,
  onSelect,
}: {
  items: string[];
  onClear: () => void;
  onSelect: (keyword: string) => void;
}) {
  if (!items.length) return null;

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text style={styles.title}>最近搜索</Text>
        <Pressable
          accessibilityLabel="清除最近搜索"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClear}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={styles.clear}>清除</Text>
        </Pressable>
      </View>
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

const styles = StyleSheet.create({
  section: { paddingTop: 18 },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  title: { color: COLORS.ink, fontSize: 13, fontWeight: '700' },
  clear: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  list: { gap: 8, paddingRight: 20, paddingTop: 10 },
  item: {
    backgroundColor: COLORS.surface,
    borderCurve: 'continuous',
    borderRadius: 13,
    justifyContent: 'center',
    minHeight: 36,
    maxWidth: 180,
    paddingHorizontal: 14,
  },
  itemPressed: { backgroundColor: COLORS.accentSoft },
  itemText: { color: COLORS.ink, fontSize: 13, fontWeight: '600' },
  pressed: { opacity: 0.6 },
});
