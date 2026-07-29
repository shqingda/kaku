import { useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/design';
import {
  getCollectionStatusLabel,
  supportsWatchProgress,
} from '@/features/catalog/subject-types';
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
      draft.collectionStatus === 'wish' ? '改为想看' : '移出收藏盒';
    const clearedRecords = [
      clearsProgress
        ? `已看的 ${item.watchedEpisodeNumbers.length} 集`
        : null,
      clearsRating ? `${item.rating} 分评分` : null,
    ].filter(Boolean);

    Alert.alert(
      clearedRecords.length > 0 ? '清空个人记录？' : '移出收藏盒？',
      clearedRecords.length > 0
        ? `${action}会清空${clearedRecords.join('和')}。`
        : '该条目将不再保留当前收藏状态。',
      [
        { style: 'cancel', text: '保留' },
        {
          onPress: () => applyDraft(draft),
          style: 'destructive',
          text: clearedRecords.length > 0 ? '清空并继续' : '移出',
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
          <View style={styles.headingTitle}>
            <SymbolView
              name={{
                android: status ? 'bookmark' : 'bookmark_border',
                ios: status ? 'bookmark.fill' : 'bookmark',
                web: status ? 'bookmark' : 'bookmark_border',
              }}
              size={17}
              tintColor={status ? COLORS.accent : COLORS.muted}
              weight="semibold"
            />
            <Text style={styles.title}>收藏盒</Text>
          </View>
          <View style={styles.editHint}>
            <Text style={styles.editText}>{status ? '编辑' : '添加'}</Text>
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
        </View>

        <View style={styles.summary}>
          {status ? (
            <>
              <View style={[styles.chip, styles.statusChip]}>
                <Text style={styles.statusChipText}>
                  {getCollectionStatusLabel(subjectType, status)}
                </Text>
              </View>
              {canShowPersonalData && supportsProgress ? (
                <View style={styles.chip}>
                  <Text style={styles.chipLabel}>进度</Text>
                  <Text style={styles.chipValue}>
                    {item.watchedEpisodeNumbers.length}/{item.totalEpisodes} 集
                  </Text>
                </View>
              ) : null}
              {canShowPersonalData ? (
                <View style={styles.chip}>
                  <Text style={styles.chipLabel}>评分</Text>
                  {item.rating ? (
                    <RatingStars rating={item.rating} size={12} />
                  ) : (
                    <Text style={styles.unsetText}>未评分</Text>
                  )}
                </View>
              ) : null}
            </>
          ) : (
            <Text style={styles.emptyText}>尚未收藏</Text>
          )}
        </View>
      </Pressable>

      <CollectionBoxSheet
        item={item}
        onClose={() => setIsOpen(false)}
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
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headingTitle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  title: { color: COLORS.ink, fontSize: 18, fontWeight: '700' },
  editHint: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  editText: { color: COLORS.subtle, fontSize: 12, fontWeight: '600' },
  summary: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: '#F7F6F2',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 5,
    minHeight: 34,
    paddingHorizontal: 11,
  },
  statusChip: { backgroundColor: COLORS.accentSoft },
  statusChipText: { color: COLORS.accent, fontSize: 12, fontWeight: '800' },
  chipLabel: { color: COLORS.subtle, fontSize: 10, fontWeight: '600' },
  chipValue: {
    color: COLORS.ink,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  unsetText: { color: COLORS.muted, fontSize: 11, fontWeight: '600' },
  emptyText: { color: COLORS.subtle, fontSize: 13 },
  pressed: { opacity: 0.58 },
});
