import type { ReactNode } from 'react';
import { SymbolView } from 'expo-symbols';
import {
  Alert,
  type GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { COLORS } from '@/constants/design';
import {
  getCollectionStatusLabel,
  supportsWatchProgress,
} from '@/features/catalog/subject-types';
import type {
  CollectionStatus,
  WatchingItem,
} from '@/features/watching/model';
import { canRateCollectionStatus } from '@/features/watching/progress';
import { playSelectionHaptic } from '@/lib/haptics';

const STATUS_OPTIONS: CollectionStatus[] = [
  'wish',
  'completed',
  'doing',
  'onHold',
  'dropped',
];

export function CollectionControls({
  item,
  onChangeRating,
  onChangeStatus,
  progressControl,
}: {
  item: WatchingItem;
  onChangeRating: (rating?: number) => void;
  onChangeStatus: (status?: CollectionStatus) => void;
  progressControl?: ReactNode;
}) {
  function selectStatus(status?: CollectionStatus) {
    const cancelsCollection =
      status === undefined && item.collectionStatus != null;
    const clearsProgress =
      item.watchedEpisodeNumbers.length > 0 &&
      (status === 'wish' || status === undefined);
    const clearsRating =
      item.rating !== undefined &&
      (status === 'wish' || status === undefined);

    if (cancelsCollection || clearsProgress || clearsRating) {
      const action = status === 'wish' ? '改为想看' : '取消收藏';
      const clearedRecords = [
        clearsProgress
          ? `已看的 ${item.watchedEpisodeNumbers.length} 集`
          : null,
        clearsRating ? `${item.rating} 分评分` : null,
      ].filter(Boolean);
      const title =
        clearedRecords.length > 0 ? '清空个人记录？' : '取消收藏？';
      const message =
        clearedRecords.length > 0
          ? `${action}会清空${clearedRecords.join('和')}。`
          : '该条目将不再保留当前收藏状态。';

      Alert.alert(
        title,
        message,
        [
          { style: 'cancel', text: '保留' },
          {
            onPress: () => {
              onChangeStatus(status);
              playSelectionHaptic();
            },
            style: 'destructive',
            text:
              clearedRecords.length > 0 ? '清空并继续' : '取消收藏',
          },
        ],
      );
      return;
    }

    onChangeStatus(status);
    playSelectionHaptic();
  }

  function selectRating(
    event: GestureResponderEvent,
    starIndex: number,
  ) {
    const rating =
      starIndex * 2 + (event.nativeEvent.locationX < 22 ? 1 : 2);
    onChangeRating(item.rating === rating ? undefined : rating);
    playSelectionHaptic();
  }

  const canRate = canRateCollectionStatus(item.collectionStatus);
  const wishLabel = getCollectionStatusLabel(item.type ?? 2, 'wish');

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
            style={({ pressed }) => [
              styles.clear,
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name={{
                android: 'bookmark_remove',
                ios: 'bookmark.slash',
                web: 'bookmark_remove',
              }}
              size={13}
              tintColor={COLORS.accent}
              weight="semibold"
            />
            <Text style={styles.clearText}>取消收藏</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.hint}>
        {supportsWatchProgress(item.type ?? 2)
          ? `${wishLabel}状态不记录观看进度和评分`
          : `${wishLabel}状态不记录评分`}
      </Text>

      <View style={styles.statuses}>
        {STATUS_OPTIONS.map((status) => {
          const isSelected = item.collectionStatus === status;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={status}
              onPress={() => selectStatus(status)}
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
                {getCollectionStatusLabel(item.type ?? 2, status)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {progressControl}

      {canRate ? (
        <>
          <View style={styles.ratingHeader}>
            <Text style={styles.ratingLabel}>我的评分</Text>
            <Text style={styles.ratingValue}>
              {item.rating
                ? `${(item.rating / 2).toFixed(
                    item.rating % 2 === 0 ? 0 : 1,
                  )} 星`
                : '未评分'}
            </Text>
          </View>
          <View style={styles.ratings}>
            {Array.from({ length: 5 }, (_, starIndex) => {
              const fullRating = (starIndex + 1) * 2;
              const state =
                (item.rating ?? 0) >= fullRating
                  ? 'full'
                  : item.rating === fullRating - 1
                    ? 'half'
                    : 'empty';

              return (
                <Pressable
                  accessibilityHint="点击左半边选择半星，右半边选择整星；再次点击相同评分可取消"
                  accessibilityLabel={`第 ${starIndex + 1} 颗评分星`}
                  accessibilityRole="button"
                  key={starIndex}
                  onPress={(event) => selectRating(event, starIndex)}
                  style={({ pressed }) => [
                    styles.rating,
                    pressed && styles.pressed,
                  ]}
                >
                  <SymbolView
                    name={
                      state === 'full'
                        ? {
                            android: 'star',
                            ios: 'star.fill',
                            web: 'star',
                          }
                        : state === 'half'
                          ? {
                              android: 'star_half',
                              ios: 'star.leadinghalf.filled',
                              web: 'star_half',
                            }
                          : {
                              android: 'star_border',
                              ios: 'star',
                              web: 'star_border',
                            }
                    }
                    size={28}
                    tintColor={
                      state === 'empty' ? COLORS.subtle : COLORS.accent
                    }
                    weight="medium"
                  />
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
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
  clear: {
    alignItems: 'center',
    backgroundColor: COLORS.accentSoft,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  clearText: { color: COLORS.accent, fontSize: 12, fontWeight: '800' },
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
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 10,
  },
  rating: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    width: 44,
  },
  pressed: { opacity: 0.62 },
});
