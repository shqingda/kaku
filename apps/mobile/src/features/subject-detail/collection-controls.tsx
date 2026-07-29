import { useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/design';
import {
  getCollectionStatusLabel,
  supportsWatchProgress,
} from '@/features/catalog/subject-types';
import { getRatingLabel } from '@/features/reviews/rating-label';
import { RatingStars } from '@/features/reviews/rating-stars';
import type {
  CollectionStatus,
  WatchingItem,
} from '@/features/watching/model';
import { canRateCollectionStatus } from '@/features/watching/progress';
import { playSelectionHaptic } from '@/lib/haptics';

import {
  CollectionBoxSheet,
  type CollectionBoxDraft,
} from './collection-box-sheet';

export function CollectionControls({
  item,
  onChangeRating,
  onChangeStatus,
  onChangeWatchedCount,
}: {
  item: WatchingItem;
  onChangeRating: (rating?: number) => void;
  onChangeStatus: (status?: CollectionStatus) => void;
  onChangeWatchedCount: (watchedCount: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const subjectType = item.type ?? 2;
  const supportsProgress =
    supportsWatchProgress(subjectType) && item.totalEpisodes > 0;
  const status = item.collectionStatus ?? undefined;
  const canShowPersonalData = canRateCollectionStatus(status);
  const hasLongProgress =
    String(item.watchedEpisodeNumbers.length).length +
      String(item.totalEpisodes).length >
    5;

  function applyDraft(draft: CollectionBoxDraft) {
    onChangeStatus(draft.collectionStatus);

    if (canRateCollectionStatus(draft.collectionStatus)) {
      if (supportsProgress) {
        onChangeWatchedCount(draft.watchedCount);
      }
      onChangeRating(draft.rating);
    }

    setIsOpen(false);
    playSelectionHaptic();
  }

  function saveDraft(draft: CollectionBoxDraft) {
    const clearsProgress =
      item.watchedEpisodeNumbers.length > 0 &&
      (draft.collectionStatus === 'wish' ||
        draft.collectionStatus === undefined);
    const clearsRating =
      item.rating !== undefined &&
      (draft.collectionStatus === 'wish' ||
        draft.collectionStatus === undefined);
    const removesCollection =
      draft.collectionStatus === undefined && status !== undefined;

    if (!clearsProgress && !clearsRating && !removesCollection) {
      applyDraft(draft);
      return;
    }

    const action =
      draft.collectionStatus === 'wish' ? '改为想看' : '取消收藏';
    const clearedRecords = [
      clearsProgress
        ? `已看的 ${item.watchedEpisodeNumbers.length} 集`
        : null,
      clearsRating ? `${item.rating} 分评分` : null,
    ].filter(Boolean);

    Alert.alert(
      clearedRecords.length > 0 ? '清空个人记录？' : '取消收藏？',
      clearedRecords.length > 0
        ? `${action}会清空${clearedRecords.join('和')}。`
        : '该条目将不再保留当前收藏状态。',
      [
        { style: 'cancel', text: '保留' },
        {
          onPress: () => applyDraft(draft),
          style: 'destructive',
          text: clearedRecords.length > 0 ? '清空并继续' : '取消收藏',
        },
      ],
    );
  }

  return (
    <>
      <Pressable
        accessibilityLabel="打开收藏盒"
        accessibilityRole="button"
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [
          styles.panel,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.heading}>
          <View style={styles.headingCopy}>
            <Text style={styles.title}>收藏盒</Text>
            <Text style={[styles.statusValue, !status && styles.emptyStatus]}>
              {status
                ? getCollectionStatusLabel(subjectType, status)
                : '加入收藏'}
            </Text>
          </View>
          <View style={styles.editButton}>
            <SymbolView
              name={{
                android: 'edit',
                ios: 'square.and.pencil',
                web: 'edit',
              }}
              size={16}
              tintColor={COLORS.subtle}
              weight="semibold"
            />
          </View>
        </View>

        {canShowPersonalData ? (
          <View style={styles.details}>
            {supportsProgress ? (
              <View style={styles.progressDetail}>
                <View style={styles.progressHeading}>
                  <View style={styles.progressValue}>
                    <Text
                      style={[
                        styles.watchedValue,
                        hasLongProgress && styles.compactWatchedValue,
                      ]}
                    >
                      {item.watchedEpisodeNumbers.length}
                    </Text>
                    <Text
                      style={[
                        styles.totalValue,
                        hasLongProgress && styles.compactTotalValue,
                      ]}
                    >
                      /{item.totalEpisodes}
                    </Text>
                    <Text
                      style={[
                        styles.unitValue,
                        hasLongProgress && styles.compactUnitValue,
                      ]}
                    >
                      集
                    </Text>
                  </View>
                  {!hasLongProgress ? (
                    <Text style={styles.detailHint}>观看进度</Text>
                  ) : null}
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(
                          (item.watchedEpisodeNumbers.length /
                            item.totalEpisodes) *
                            100,
                          100,
                        )}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            ) : null}
            {supportsProgress ? <View style={styles.divider} /> : null}
            <View style={styles.ratingDetail}>
              <Text
                style={[
                  styles.ratingLabel,
                  !item.rating && styles.unsetText,
                ]}
              >
                {item.rating ? getRatingLabel(item.rating) : '未评分'}
              </Text>
              {item.rating ? (
                <RatingStars rating={item.rating} size={10} />
              ) : (
                <Text style={styles.detailHint}>我的评分</Text>
              )}
            </View>
          </View>
        ) : null}
      </Pressable>

      <CollectionBoxSheet
        item={item}
        onClose={() => setIsOpen(false)}
        onRemove={() =>
          saveDraft({
            collectionStatus: undefined,
            rating: undefined,
            watchedCount: 0,
          })
        }
        onSave={saveDraft}
        supportsProgress={supportsProgress}
        visible={isOpen}
      />
    </>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    marginBottom: 14,
    padding: 20,
  },
  heading: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headingCopy: { gap: 7 },
  title: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  statusValue: { color: COLORS.accent, fontSize: 20, fontWeight: '800' },
  emptyStatus: { color: COLORS.accent },
  editButton: {
    alignItems: 'center',
    backgroundColor: '#F7F6F2',
    borderRadius: 15,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  details: {
    alignItems: 'center',
    borderTopColor: '#ECE9E2',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    marginTop: 18,
    minHeight: 68,
    paddingTop: 16,
  },
  progressDetail: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    paddingRight: 18,
  },
  progressHeading: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressValue: {
    alignItems: 'baseline',
    flexDirection: 'row',
  },
  watchedValue: {
    color: COLORS.accent,
    fontSize: 19,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  compactWatchedValue: { fontSize: 17 },
  totalValue: {
    color: COLORS.ink,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  compactTotalValue: { fontSize: 15 },
  unitValue: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 5,
  },
  compactUnitValue: { fontSize: 11, marginLeft: 4 },
  detailHint: { color: COLORS.subtle, fontSize: 10, fontWeight: '600' },
  progressTrack: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 2,
    height: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: COLORS.accent,
    borderRadius: 2,
    height: 3,
  },
  divider: {
    backgroundColor: '#E3E0D9',
    height: 52,
    width: 1,
  },
  ratingDetail: {
    alignItems: 'flex-start',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    minWidth: 0,
    paddingLeft: 18,
  },
  ratingLabel: { color: COLORS.ink, fontSize: 17, fontWeight: '800' },
  unsetText: { color: COLORS.muted },
  pressed: { opacity: 0.58 },
});
