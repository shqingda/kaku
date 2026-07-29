import { useEffect, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import { getCollectionStatusLabel } from '@/features/catalog/subject-types';
import { RatingStars } from '@/features/reviews/rating-stars';
import type {
  CollectionStatus,
  WatchingItem,
} from '@/features/watching/model';
import { canRateCollectionStatus } from '@/features/watching/progress';

export type CollectionBoxDraft = {
  collectionStatus?: CollectionStatus;
  rating?: number;
  watchedCount: number;
};

const STATUS_OPTIONS: CollectionStatus[] = [
  'wish',
  'completed',
  'doing',
  'onHold',
  'dropped',
];

const RATING_OPTIONS = Array.from({ length: 10 }, (_, index) => index + 1);

export function CollectionBoxSheet({
  item,
  onClose,
  onSave,
  supportsProgress,
  visible,
}: {
  item: WatchingItem;
  onClose: () => void;
  onSave: (draft: CollectionBoxDraft) => void;
  supportsProgress: boolean;
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<CollectionStatus | undefined>(
    item.collectionStatus ?? undefined,
  );
  const [watchedCount, setWatchedCount] = useState(
    String(item.watchedEpisodeNumbers.length),
  );
  const [rating, setRating] = useState(item.rating);
  const canEditPersonalData = canRateCollectionStatus(status);
  const showsProgress =
    canEditPersonalData && supportsProgress && item.totalEpisodes > 0;

  useEffect(() => {
    if (!visible) {
      return;
    }

    setStatus(item.collectionStatus ?? undefined);
    setWatchedCount(String(item.watchedEpisodeNumbers.length));
    setRating(item.rating);
  }, [
    item.collectionStatus,
    item.rating,
    item.watchedEpisodeNumbers.length,
    visible,
  ]);

  function save() {
    const parsedCount = Number(watchedCount);
    const nextCount =
      showsProgress && Number.isInteger(parsedCount)
        ? Math.min(Math.max(parsedCount, 0), item.totalEpisodes)
        : 0;

    onSave({
      collectionStatus: status,
      rating: canEditPersonalData ? rating : undefined,
      watchedCount: nextCount,
    });
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable
          accessibilityLabel="关闭收藏盒"
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 18) },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.heading}>
            <View>
              <Text style={styles.title}>收藏盒</Text>
              <Text style={styles.hint}>设置收藏状态和个人记录</Text>
            </View>
            <Pressable
              accessibilityLabel="关闭收藏盒"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <SymbolView
                name={{
                  android: 'close',
                  ios: 'xmark',
                  web: 'close',
                }}
                size={17}
                tintColor={COLORS.muted}
                weight="semibold"
              />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View>
              <Text style={styles.sectionLabel}>收藏状态</Text>
              <View style={styles.statusOptions}>
                {STATUS_OPTIONS.map((option) => {
                  const isSelected = status === option;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      key={option}
                      onPress={() => setStatus(option)}
                      style={({ pressed }) => [
                        styles.statusOption,
                        isSelected && styles.selectedStatusOption,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          isSelected && styles.selectedStatusText,
                        ]}
                      >
                        {getCollectionStatusLabel(item.type ?? 2, option)}
                      </Text>
                      {isSelected ? (
                        <SymbolView
                          name={{
                            android: 'check',
                            ios: 'checkmark',
                            web: 'check',
                          }}
                          size={15}
                          tintColor={COLORS.accent}
                          weight="bold"
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {showsProgress ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>观看进度</Text>
                <View style={styles.progressControl}>
                  <TextInput
                    accessibilityLabel="已看集数"
                    keyboardType="number-pad"
                    maxLength={String(item.totalEpisodes).length}
                    onChangeText={(value) =>
                      setWatchedCount(value.replace(/\D/g, ''))
                    }
                    selectTextOnFocus
                    style={styles.progressInput}
                    value={watchedCount}
                  />
                  <Text style={styles.progressTotal}>
                    / {item.totalEpisodes} 集
                  </Text>
                </View>
              </View>
            ) : null}

            {canEditPersonalData ? (
              <View style={styles.section}>
                <View style={styles.ratingHeading}>
                  <Text style={styles.sectionLabel}>我的评分</Text>
                  {rating ? (
                    <View style={styles.currentRating}>
                      <RatingStars rating={rating} size={13} />
                      <Text style={styles.currentRatingText}>{rating} 分</Text>
                    </View>
                  ) : (
                    <Text style={styles.unsetText}>未评分</Text>
                  )}
                </View>
                <View style={styles.ratingOptions}>
                  {RATING_OPTIONS.map((option) => {
                    const isSelected = rating === option;

                    return (
                      <Pressable
                        accessibilityLabel={`${option} 分`}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        key={option}
                        onPress={() =>
                          setRating(isSelected ? undefined : option)
                        }
                        style={({ pressed }) => [
                          styles.ratingOption,
                          isSelected && styles.selectedRatingOption,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.ratingOptionText,
                            isSelected && styles.selectedRatingOptionText,
                          ]}
                        >
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={styles.inactiveNotice}>
                <Text style={styles.inactiveNoticeText}>
                  {status === 'wish'
                    ? '想看状态不记录观看进度和评分'
                    : '选择收藏状态后可记录进度和评分'}
                </Text>
              </View>
            )}

            {item.collectionStatus ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setStatus(undefined)}
                style={({ pressed }) => [
                  styles.removeButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.removeText}>移出收藏盒</Text>
              </Pressable>
            ) : null}
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            onPress={save}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.saveText}>保存</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: COLORS.track,
    borderRadius: 2,
    height: 4,
    marginBottom: 16,
    width: 36,
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: { color: COLORS.ink, fontSize: 20, fontWeight: '800' },
  hint: { color: COLORS.subtle, fontSize: 11, marginTop: 4 },
  content: { paddingBottom: 14, paddingTop: 20 },
  section: { marginTop: 20 },
  sectionLabel: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  statusOptions: {
    backgroundColor: '#F7F6F2',
    borderRadius: 16,
    overflow: 'hidden',
    paddingHorizontal: 14,
  },
  statusOption: {
    alignItems: 'center',
    borderBottomColor: COLORS.track,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 4,
  },
  selectedStatusOption: { backgroundColor: COLORS.accentSoft },
  statusText: { color: COLORS.ink, fontSize: 14, fontWeight: '600' },
  selectedStatusText: { color: COLORS.accent, fontWeight: '800' },
  progressControl: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F7F6F2',
    borderRadius: 14,
    flexDirection: 'row',
    minHeight: 48,
    paddingHorizontal: 14,
  },
  progressInput: {
    color: COLORS.accent,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    minWidth: 42,
    padding: 0,
    textAlign: 'right',
  },
  progressTotal: {
    color: COLORS.muted,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  ratingHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  currentRating: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  currentRatingText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  unsetText: {
    color: COLORS.subtle,
    fontSize: 11,
    marginBottom: 10,
  },
  ratingOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratingOption: {
    alignItems: 'center',
    backgroundColor: '#F7F6F2',
    borderColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    flexBasis: '17%',
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 42,
  },
  selectedRatingOption: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent,
  },
  ratingOptionText: {
    color: COLORS.muted,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  selectedRatingOptionText: { color: COLORS.accent, fontWeight: '800' },
  inactiveNotice: {
    backgroundColor: '#F7F6F2',
    borderRadius: 14,
    marginTop: 20,
    padding: 14,
  },
  inactiveNoticeText: {
    color: COLORS.subtle,
    fontSize: 12,
    lineHeight: 18,
  },
  removeButton: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    marginTop: 10,
  },
  removeText: { color: COLORS.accent, fontSize: 13, fontWeight: '700' },
  saveButton: {
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 50,
  },
  saveText: { color: COLORS.surface, fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.58 },
});
