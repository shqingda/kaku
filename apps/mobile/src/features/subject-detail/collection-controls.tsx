import { useMemo, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { router, usePathname } from 'expo-router';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { rememberReturnTo } from '@/lib/auth-redirect';
import type { PersonalCollectionUpdate } from '@/features/collections/model';
import {
  getCollectionStatusLabel,
  supportsReadingProgress,
  supportsWatchProgress,
} from '@/features/catalog/subject-types';
import { getRatingLabel } from '@/features/reviews/rating-label';
import { RatingStars } from '@/features/reviews/rating-stars';
import { useTheme } from '@/features/theme/theme-provider';
import type { WatchingItem } from '@/features/watching/model';
import {
  canRateCollectionStatus,
  resizeWatchedEpisodes,
} from '@/features/watching/progress';
import { playSuccessHaptic } from '@/lib/haptics';

import {
  CollectionBoxSheet,
  type CollectionBoxDraft,
} from './collection-box-sheet';

export function CollectionControls({
  item,
  onSave,
  variant = 'panel',
}: {
  item: WatchingItem;
  onSave: (update: PersonalCollectionUpdate) => Promise<void>;
  variant?: 'panel' | 'compact';
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const pathname = usePathname();
  const { session } = useAuth();
  const subjectType = item.type ?? 2;
  const supportsProgress =
    supportsWatchProgress(subjectType) && item.totalEpisodes > 0;
  const supportsBookProgress = supportsReadingProgress(subjectType);
  const status = item.collectionStatus ?? undefined;
  const canShowPersonalData = canRateCollectionStatus(status);
  const displayedProgress = supportsProgress
    ? item.watchedEpisodeNumbers.length
    : 1;
  const displayedTotal = supportsProgress ? item.totalEpisodes : 1;
  const hasLongProgress =
    String(displayedProgress).length + String(displayedTotal).length >
    5;

  async function applyDraft(draft: CollectionBoxDraft) {
    setIsSaving(true);

    try {
      const canSavePersonalData = canRateCollectionStatus(
        draft.collectionStatus,
      );
      await onSave({
        collectionStatus: draft.collectionStatus ?? null,
        comment: draft.comment,
        isPrivate: draft.isPrivate,
        readChapterCount:
          supportsBookProgress && canSavePersonalData
            ? draft.readChapterCount
            : supportsBookProgress
              ? 0
              : undefined,
        readVolumeCount:
          supportsBookProgress && canSavePersonalData
            ? draft.readVolumeCount
            : supportsBookProgress
              ? 0
              : undefined,
        rating: canSavePersonalData ? draft.rating : undefined,
        tags: draft.tags,
        watchedEpisodeNumbers:
          canSavePersonalData && supportsProgress
            ? resizeWatchedEpisodes(
                item.watchedEpisodeNumbers,
                draft.watchedCount,
                item.totalEpisodes,
              )
            : supportsProgress
              ? []
              : undefined,
      });
      setIsOpen(false);
      playSuccessHaptic();
    } catch (error) {
      Alert.alert(
        '收藏没有保存',
        error instanceof Error ? error.message : '请稍后重试。',
      );
    } finally {
      setIsSaving(false);
    }
  }

  function saveDraft(draft: CollectionBoxDraft) {
    if (!draft.collectionStatus) {
      return;
    }

    const clearsProgress =
      item.watchedEpisodeNumbers.length > 0 &&
      (draft.collectionStatus === 'wish' ||
        draft.collectionStatus === undefined);
    const clearsRating =
      item.rating !== undefined &&
      (draft.collectionStatus === 'wish' ||
        draft.collectionStatus === undefined);
    const clearsReadingProgress =
      ((item.readChapterCount ?? 0) > 0 || (item.readVolumeCount ?? 0) > 0) &&
      (draft.collectionStatus === 'wish' ||
        draft.collectionStatus === undefined);
    if (
      !clearsProgress &&
      !clearsReadingProgress &&
      !clearsRating
    ) {
      void applyDraft(draft);
      return;
    }

    const action = `改为${getCollectionStatusLabel(subjectType, 'wish')}`;
    const clearedRecords = [
      clearsProgress
        ? `已看的 ${item.watchedEpisodeNumbers.length} 集`
        : null,
      clearsReadingProgress
        ? `阅读进度（${item.readChapterCount ?? 0} 章 / ${item.readVolumeCount ?? 0} 卷）`
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
          onPress: () => void applyDraft(draft),
          style: 'destructive',
          text: clearedRecords.length > 0 ? '清空并继续' : '取消收藏',
        },
      ],
    );
  }

  function openCollectionBox() {
    if (session) {
      setIsOpen(true);
      return;
    }

    Alert.alert(
      '登录后使用收藏盒',
      '收藏状态、进度和评分会保存到你的 Bangumi 账户。',
      [
        { style: 'cancel', text: '取消' },
        {
          onPress: () => {
            rememberReturnTo(pathname);
            router.push('/account');
          },
          text: '去登录',
        },
      ],
    );
  }

  function openRemovalFlow() {
    Alert.alert(
      '在 Bangumi 取消收藏？',
      'Bangumi 官方 API 暂未开放取消收藏，Kaku 需要打开原条目页面完成。返回 Kaku 后会自动重新读取收藏状态。',
      [
        { style: 'cancel', text: '保留' },
        {
          onPress: () => {
            void Linking.openURL(`https://bgm.tv/subject/${item.id}`)
              .then(() => setIsOpen(false))
              .catch(() => {
                Alert.alert('无法打开 Bangumi', '请稍后重试。');
              });
          },
          text: '打开 Bangumi',
        },
      ],
    );
  }

  return (
    <>
      {variant === 'compact' ? (
        <Pressable
          accessibilityLabel={`编辑${item.title}的收藏和进度`}
          accessibilityRole="button"
          hitSlop={5}
          onPress={(event) => {
            event.stopPropagation();
            openCollectionBox();
          }}
          style={({ pressed }) => [
            styles.compactButton,
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            name={{ android: 'edit', ios: 'square.and.pencil', web: 'edit' }}
            size={16}
            tintColor={colors.ink}
            weight="semibold"
          />
        </Pressable>
      ) : (
        <Pressable
        accessibilityLabel="打开收藏盒"
        accessibilityRole="button"
        onPress={openCollectionBox}
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
              tintColor={colors.ink}
              weight="semibold"
            />
          </View>
        </View>

        {canShowPersonalData ? (
          <View style={styles.details}>
            <View style={styles.progressDetail}>
              <View style={styles.progressHeading}>
                <View style={styles.progressValue}>
                  <Text
                    style={[
                      styles.watchedValue,
                      hasLongProgress && styles.compactWatchedValue,
                    ]}
                  >
                    {displayedProgress}
                  </Text>
                  <Text
                    style={[
                      styles.totalValue,
                      hasLongProgress && styles.compactTotalValue,
                    ]}
                  >
                    /{displayedTotal}
                  </Text>
                  {supportsProgress ? (
                    <Text
                      style={[
                        styles.unitValue,
                        hasLongProgress && styles.compactUnitValue,
                      ]}
                    >
                      集
                    </Text>
                  ) : null}
                </View>
                {!hasLongProgress ? (
                  <Text style={styles.detailHint}>
                    {supportsProgress ? '观看进度' : '条目进度'}
                  </Text>
                ) : null}
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(
                        (displayedProgress / displayedTotal) * 100,
                        100,
                      )}%`,
                    },
                  ]}
                />
              </View>
            </View>
            <View style={styles.divider} />
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
      )}

      <CollectionBoxSheet
        isSaving={isSaving}
        item={item}
        onClose={() => setIsOpen(false)}
        onRemove={openRemovalFlow}
        onSave={saveDraft}
        supportsProgress={supportsProgress}
        visible={isOpen}
      />
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    marginBottom: 14,
    padding: 20,
  },
  compactButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    height: 34,
    justifyContent: 'center',
    marginLeft: 10,
    width: 34,
  },
  heading: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headingCopy: { gap: 7 },
  title: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  statusValue: { color: colors.accent, fontSize: 20, fontWeight: '800' },
  emptyStatus: { color: colors.accent },
  editButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  details: {
    alignItems: 'center',
    borderTopColor: colors.divider,
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
    color: colors.accent,
    fontSize: 19,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  compactWatchedValue: { fontSize: 17 },
  totalValue: {
    color: colors.ink,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  compactTotalValue: { fontSize: 15 },
  unitValue: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 5,
  },
  compactUnitValue: { fontSize: 11, marginLeft: 4 },
  detailHint: { color: colors.subtle, fontSize: 10, fontWeight: '600' },
  progressTrack: {
    backgroundColor: colors.accentSoft,
    borderRadius: 2,
    height: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.accent,
    borderRadius: 2,
    height: 3,
  },
  divider: {
    backgroundColor: colors.divider,
    height: 34,
    width: StyleSheet.hairlineWidth,
  },
  ratingDetail: {
    alignItems: 'flex-start',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    minWidth: 0,
    paddingLeft: 18,
  },
  ratingLabel: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  unsetText: { color: colors.muted },
  pressed: { opacity: 0.58 },
});
