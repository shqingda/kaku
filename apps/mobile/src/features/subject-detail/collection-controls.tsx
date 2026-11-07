import { useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { router, usePathname } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { HIT_SLOP, SPACING, TYPE } from '@/constants/design';
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
import { canRateCollectionStatus } from '@/features/watching/progress';
import { playSuccessHaptic } from '@/lib/haptics';

import type { CollectionBoxDraft } from './collection-box-draft';
import { collectionBoxUpdateFromDraft } from './collection-box-draft';
import { CollectionBoxSheet } from './collection-box-sheet';

export function CollectionControls({
  initiallyOpen = false,
  item,
  onDismiss,
  onSave,
  variant = 'panel',
}: {
  initiallyOpen?: boolean;
  item: WatchingItem;
  onDismiss?: () => void;
  onSave: (update: PersonalCollectionUpdate) => Promise<void>;
  variant?: 'panel' | 'compact';
}) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const [isOpen, setIsOpen] = useState(initiallyOpen);
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
      await onSave(
        collectionBoxUpdateFromDraft(draft, item, {
          supportsWatchProgress: supportsProgress,
          supportsReadingProgress: supportsBookProgress,
        }),
      );
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
      draft.collectionStatus === 'wish';
    const clearsRating =
      item.rating !== undefined &&
      draft.collectionStatus === 'wish';
    const clearsReadingProgress =
      ((item.readChapterCount ?? 0) > 0 || (item.readVolumeCount ?? 0) > 0) &&
      draft.collectionStatus === 'wish';
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
      '清空个人记录？',
      `${action}会清空${clearedRecords.join('和')}。`,
      [
        { style: 'cancel', text: '保留' },
        {
          onPress: () => void applyDraft(draft),
          style: 'destructive',
          text: '清空并继续',
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

  return (
    <>
      {variant === 'compact' ? (
        <Pressable
          accessibilityLabel={`编辑${item.title}的收藏和进度`}
          accessibilityRole="button"
          hitSlop={HIT_SLOP}
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
        onClose={() => {
          setIsOpen(false);
          onDismiss?.();
        }}
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
    marginBottom: SPACING.lg,
    padding: SPACING.xl,
  },
  compactButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    height: 34,
    justifyContent: 'center',
    marginLeft: SPACING.md,
    width: 34,
  },
  heading: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headingCopy: { gap: SPACING.sm },
  title: { color: colors.muted, ...TYPE.micro, fontWeight: '600' },
  statusValue: { color: colors.accent, ...TYPE.title, fontWeight: '800' },
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
    marginTop: SPACING.lg,
    minHeight: 68,
    paddingTop: SPACING.lg,
  },
  progressDetail: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    paddingRight: SPACING.lg,
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
    ...TYPE.title,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  compactWatchedValue: { ...TYPE.heading },
  totalValue: {
    color: colors.ink,
    ...TYPE.heading,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  compactTotalValue: { ...TYPE.body },
  unitValue: {
    color: colors.muted,
    ...TYPE.caption,
    fontWeight: '700',
    marginLeft: SPACING.xs,
  },
  compactUnitValue: { ...TYPE.micro, marginLeft: SPACING.xs },
  detailHint: { color: colors.subtle, ...TYPE.micro, fontWeight: '600' },
  progressTrack: {
    backgroundColor: colors.accentSoft,
    borderRadius: 2,
    height: 3,
    marginTop: SPACING.md,
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
    gap: SPACING.sm,
    justifyContent: 'center',
    minWidth: 0,
    paddingLeft: SPACING.lg,
  },
  ratingLabel: { color: colors.ink, ...TYPE.heading, fontWeight: '800' },
  unsetText: { color: colors.muted },
  pressed: { opacity: 0.58 },
});
