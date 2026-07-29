import { type ReactNode, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import {
  Alert,
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

import { RatingPicker, RatingStars } from './rating-picker';

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
  const [isRatingPickerOpen, setIsRatingPickerOpen] = useState(false);

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

  function selectRating(rating?: number) {
    onChangeRating(rating);
    setIsRatingPickerOpen(false);
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

      {item.collectionStatus === 'wish' ? (
        <Text style={styles.wishHint}>
          {supportsWatchProgress(item.type ?? 2)
            ? `${wishLabel}不记录观看进度和评分`
            : `${wishLabel}不记录评分`}
        </Text>
      ) : null}

      {progressControl || canRate ? (
        <View style={styles.settings}>
          {progressControl ? (
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>观看进度</Text>
              {progressControl}
            </View>
          ) : null}
          {canRate ? (
            <Pressable
              accessibilityLabel={
                item.rating
                  ? `我的评分 ${item.rating} 分，点击修改`
                  : '我的评分，未评分，点击选择'
              }
              accessibilityRole="button"
              onPress={() => setIsRatingPickerOpen(true)}
              style={({ pressed }) => [
                styles.settingRow,
                Boolean(progressControl) && styles.settingDivider,
                pressed && styles.settingPressed,
              ]}
            >
              <Text style={styles.settingLabel}>我的评分</Text>
              <View style={styles.ratingSummary}>
                {item.rating ? (
                  <>
                    <RatingStars rating={item.rating} />
                    <Text style={styles.ratingScore}>
                      {item.rating} 分
                    </Text>
                  </>
                ) : (
                  <Text style={styles.settingValue}>未评分</Text>
                )}
                <SymbolView
                  name={{
                    android: 'chevron_right',
                    ios: 'chevron.right',
                    web: 'chevron_right',
                  }}
                  size={13}
                  tintColor={COLORS.subtle}
                  weight="semibold"
                />
              </View>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <RatingPicker
        onChange={selectRating}
        onClose={() => setIsRatingPickerOpen(false)}
        rating={item.rating}
        visible={isRatingPickerOpen}
      />
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
  statuses: {
    backgroundColor: '#F1F0EB',
    borderRadius: 15,
    flexDirection: 'row',
    marginTop: 18,
    padding: 3,
  },
  status: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 3,
    paddingVertical: 8,
  },
  selectedStatus: { backgroundColor: COLORS.accent },
  statusText: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  selectedStatusText: { color: COLORS.surface },
  wishHint: {
    color: COLORS.subtle,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
  },
  settings: {
    backgroundColor: '#F7F6F2',
    borderRadius: 16,
    marginTop: 18,
    overflow: 'hidden',
    paddingHorizontal: 14,
  },
  settingRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
    paddingVertical: 12,
  },
  settingDivider: {
    borderTopColor: COLORS.track,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  settingPressed: { opacity: 0.58 },
  settingLabel: { color: COLORS.ink, fontSize: 14, fontWeight: '700' },
  settingValue: { color: COLORS.subtle, fontSize: 13, fontWeight: '600' },
  ratingSummary: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  ratingScore: {
    color: COLORS.muted,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  pressed: { opacity: 0.62 },
});
