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

import { CollectionStatusPicker } from './collection-status-picker';
import { RatingPicker, RatingStars } from './rating-picker';

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
  const [isStatusPickerOpen, setIsStatusPickerOpen] = useState(false);
  const subjectType = item.type ?? 2;
  const canRate = canRateCollectionStatus(item.collectionStatus);
  const wishLabel = getCollectionStatusLabel(subjectType, 'wish');

  function selectStatus(status?: CollectionStatus) {
    setIsStatusPickerOpen(false);

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

      Alert.alert(
        clearedRecords.length > 0 ? '清空个人记录？' : '取消收藏？',
        clearedRecords.length > 0
          ? `${action}会清空${clearedRecords.join('和')}。`
          : '该条目将不再保留当前收藏状态。',
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

  return (
    <>
      <View style={styles.panel}>
        <Text style={styles.title}>收藏状态</Text>
        <Pressable
          accessibilityLabel={
            item.collectionStatus
              ? `当前状态 ${getCollectionStatusLabel(
                  subjectType,
                  item.collectionStatus,
                )}，点击修改`
              : '选择收藏状态'
          }
          accessibilityRole="button"
          onPress={() => setIsStatusPickerOpen(true)}
          style={({ pressed }) => [
            styles.statusControl,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.statusLeading}>
            <View style={styles.statusIcon}>
              <SymbolView
                name={{
                  android: item.collectionStatus
                    ? 'bookmark'
                    : 'bookmark_border',
                  ios: item.collectionStatus ? 'bookmark.fill' : 'bookmark',
                  web: item.collectionStatus
                    ? 'bookmark'
                    : 'bookmark_border',
                }}
                size={17}
                tintColor={
                  item.collectionStatus ? COLORS.accent : COLORS.muted
                }
                weight="semibold"
              />
            </View>
            <Text
              style={[
                styles.statusValue,
                item.collectionStatus && styles.selectedStatusValue,
              ]}
            >
              {item.collectionStatus
                ? getCollectionStatusLabel(
                    subjectType,
                    item.collectionStatus,
                  )
                : '选择状态'}
            </Text>
          </View>
          <SymbolView
            name={{
              android: 'expand_more',
              ios: 'chevron.down',
              web: 'expand_more',
            }}
            size={15}
            tintColor={COLORS.subtle}
            weight="semibold"
          />
        </Pressable>
        {item.collectionStatus === 'wish' ? (
          <Text style={styles.wishHint}>
            {supportsWatchProgress(subjectType)
              ? `${wishLabel}不记录观看进度和评分`
              : `${wishLabel}不记录评分`}
          </Text>
        ) : null}
      </View>

      {progressControl ? (
        <View style={[styles.panel, styles.compactPanel]}>
          <Text style={styles.title}>观看进度</Text>
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
            styles.panel,
            styles.compactPanel,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.title}>我的评分</Text>
          <View style={styles.ratingSummary}>
            {item.rating ? (
              <>
                <RatingStars rating={item.rating} size={17} />
                <Text style={styles.ratingScore}>{item.rating} 分</Text>
              </>
            ) : (
              <Text style={styles.emptyValue}>未评分</Text>
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

      <CollectionStatusPicker
        currentStatus={item.collectionStatus}
        onChange={selectStatus}
        onClose={() => setIsStatusPickerOpen(false)}
        subjectType={subjectType}
        visible={isStatusPickerOpen}
      />
      <RatingPicker
        onChange={selectRating}
        onClose={() => setIsRatingPickerOpen(false)}
        rating={item.rating}
        visible={isRatingPickerOpen}
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
  compactPanel: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 76,
  },
  title: { color: COLORS.ink, fontSize: 17, fontWeight: '800' },
  statusControl: {
    alignItems: 'center',
    backgroundColor: '#F7F6F2',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    minHeight: 56,
    paddingHorizontal: 14,
  },
  statusLeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
  },
  statusIcon: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  statusValue: { color: COLORS.muted, fontSize: 15, fontWeight: '700' },
  selectedStatusValue: { color: COLORS.accent, fontWeight: '800' },
  wishHint: {
    color: COLORS.subtle,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 9,
  },
  ratingSummary: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  ratingScore: {
    color: COLORS.muted,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  emptyValue: { color: COLORS.subtle, fontSize: 13, fontWeight: '600' },
  pressed: { opacity: 0.58 },
});
