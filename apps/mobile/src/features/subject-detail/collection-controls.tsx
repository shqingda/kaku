import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/design';
import type {
  CollectionStatus,
  WatchingItem,
} from '@/features/watching/model';
import { playSelectionHaptic } from '@/lib/haptics';

const STATUS_OPTIONS: {
  label: string;
  value: CollectionStatus;
}[] = [
  { label: '想看', value: 'wish' },
  { label: '看过', value: 'completed' },
  { label: '在看', value: 'doing' },
  { label: '搁置', value: 'onHold' },
  { label: '抛弃', value: 'dropped' },
];

export function CollectionControls({
  item,
  onChangeRating,
  onChangeStatus,
}: {
  item: WatchingItem;
  onChangeRating: (rating?: number) => void;
  onChangeStatus: (status?: CollectionStatus) => void;
}) {
  function selectStatus(status?: CollectionStatus) {
    onChangeStatus(status);
    playSelectionHaptic();
  }

  function selectRating(rating?: number) {
    onChangeRating(rating);
    playSelectionHaptic();
  }

  return (
    <View style={styles.panel}>
      <View style={styles.headingRow}>
        <Text style={styles.title}>我的收藏</Text>
        {item.collectionStatus ? (
          <Pressable
            accessibilityLabel="取消收藏状态"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => selectStatus(undefined)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={styles.clear}>取消收藏</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.hint}>收藏状态、评分和观看进度彼此独立</Text>

      <View style={styles.statuses}>
        {STATUS_OPTIONS.map((option) => {
          const isSelected = item.collectionStatus === option.value;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={option.value}
              onPress={() => selectStatus(option.value)}
              style={({ pressed }) => [
                styles.status,
                isSelected && styles.selectedStatus,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  isSelected && styles.selectedStatusText,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.ratingHeader}>
        <Text style={styles.ratingLabel}>评分</Text>
        <Text style={styles.ratingValue}>
          {item.rating ? `${item.rating} / 10` : '未评分'}
        </Text>
      </View>
      <View style={styles.ratings}>
        {Array.from({ length: 10 }, (_, index) => index + 1).map((rating) => {
          const isSelected = item.rating === rating;

          return (
            <Pressable
              accessibilityLabel={`评分 ${rating} 分`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={rating}
              onPress={() => selectRating(isSelected ? undefined : rating)}
              style={({ pressed }) => [
                styles.rating,
                isSelected && styles.selectedRating,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.ratingText,
                  isSelected && styles.selectedRatingText,
                ]}
              >
                {rating}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    marginBottom: 14,
    padding: 20,
  },
  headingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: { color: COLORS.ink, fontSize: 18, fontWeight: '800' },
  clear: { color: COLORS.subtle, fontSize: 12, fontWeight: '700' },
  hint: { color: COLORS.subtle, fontSize: 11, marginTop: 5 },
  statuses: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  status: {
    alignItems: 'center',
    backgroundColor: '#F1F0EB',
    borderRadius: 12,
    minWidth: 54,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  selectedStatus: { backgroundColor: COLORS.accent },
  statusText: { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  selectedStatusText: { color: COLORS.surface },
  ratingHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  ratingLabel: { color: COLORS.ink, fontSize: 14, fontWeight: '800' },
  ratingValue: {
    color: COLORS.subtle,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  ratings: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 10,
  },
  rating: {
    alignItems: 'center',
    aspectRatio: 1,
    backgroundColor: '#F1F0EB',
    borderRadius: 9,
    flex: 1,
    justifyContent: 'center',
  },
  selectedRating: { backgroundColor: COLORS.accentSoft },
  ratingText: {
    color: COLORS.muted,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  selectedRatingText: { color: COLORS.accent, fontWeight: '900' },
  pressed: { opacity: 0.62 },
});
