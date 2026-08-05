import { useEffect, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
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
  isSaving,
  item,
  onClose,
  onRemove,
  onSave,
  supportsProgress,
  visible,
}: {
  isSaving: boolean;
  item: WatchingItem;
  onClose: () => void;
  onRemove: () => void;
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
  const progressDigits = String(item.totalEpisodes).length;
  const progressTotalWidth = 22 + progressDigits * 10;

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
            <Text style={styles.title}>收藏盒</Text>
            <Pressable
              accessibilityLabel="关闭收藏盒"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}
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
            <View style={styles.section}>
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
                      <View
                        style={[
                          styles.selectionIndicator,
                          isSelected && styles.selectedIndicator,
                        ]}
                      >
                        {isSelected ? (
                          <SymbolView
                            name={{
                              android: 'check',
                              ios: 'checkmark',
                              web: 'check',
                            }}
                            size={12}
                            tintColor={COLORS.surface}
                            weight="bold"
                          />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>个人记录</Text>
              <View style={styles.records}>
                {showsProgress ? (
                  <>
                    <View style={styles.recordRow}>
                      <Text style={styles.recordTitle}>观看进度</Text>
                      <View style={styles.progressField}>
                        <View style={styles.progressControl}>
                          <TextInput
                            accessibilityLabel="已看集数"
                            keyboardType="number-pad"
                            onChangeText={(value) =>
                              setWatchedCount(value.replace(/\D/g, ''))
                            }
                            selectTextOnFocus
                            style={styles.progressInput}
                            value={watchedCount}
                          />
                        </View>
                        <TextInput
                          accessibilityElementsHidden
                          editable={false}
                          importantForAccessibility="no"
                          style={[
                            styles.progressTotal,
                            { width: progressTotalWidth },
                          ]}
                          value={`/ ${item.totalEpisodes}`}
                        />
                      </View>
                    </View>
                    <View style={styles.recordDivider} />
                  </>
                ) : null}

                {canEditPersonalData ? (
                  <View style={styles.ratingRecord}>
                    <View style={styles.ratingHeading}>
                      <Text style={styles.recordTitle}>我的评分</Text>
                      {rating ? (
                        <View style={styles.currentRating}>
                          <RatingStars rating={rating} size={12} />
                          <Text style={styles.currentRatingText}>
                            {rating} 分
                          </Text>
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
                                isSelected &&
                                  styles.selectedRatingOptionText,
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
                    <SymbolView
                      name={{
                        android: 'info',
                        ios: 'info.circle',
                        web: 'info',
                      }}
                      size={15}
                      tintColor={COLORS.subtle}
                    />
                    <Text style={styles.inactiveNoticeText}>
                      {status === 'wish'
                        ? `${getCollectionStatusLabel(
                            item.type ?? 2,
                            'wish',
                          )}状态不记录${
                            supportsProgress ? '观看进度和' : ''
                          }评分`
                        : `选择收藏状态后可${
                            supportsProgress ? '记录进度和' : ''
                          }评分`}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            {item.collectionStatus ? (
              <Pressable
                accessibilityLabel="取消收藏"
                accessibilityRole="button"
                disabled={isSaving}
                onPress={onRemove}
                style={({ pressed }) => [
                  styles.footerButton,
                  styles.removeButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.removeText}>取消收藏</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={save}
              style={({ pressed }) => [
                styles.footerButton,
                styles.saveButton,
                pressed && styles.pressed,
              ]}
            >
              {isSaving ? (
                <ActivityIndicator color={COLORS.surface} />
              ) : (
                <Text style={styles.saveText}>保存</Text>
              )}
            </Pressable>
          </View>
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
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#F7F6F2',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  content: { paddingBottom: 12, paddingTop: 8 },
  section: { marginTop: 16 },
  sectionLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
  },
  statusOptions: {
    backgroundColor: '#F7F6F2',
    borderRadius: 16,
    padding: 4,
  },
  statusOption: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 43,
    paddingHorizontal: 12,
  },
  selectedStatusOption: { backgroundColor: COLORS.surface },
  statusText: { color: COLORS.ink, fontSize: 14, fontWeight: '600' },
  selectedStatusText: { color: COLORS.accent, fontWeight: '800' },
  selectionIndicator: {
    alignItems: 'center',
    borderColor: COLORS.track,
    borderRadius: 9,
    borderWidth: 1,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  selectedIndicator: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  records: {
    backgroundColor: '#F7F6F2',
    borderRadius: 16,
    padding: 14,
  },
  recordRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recordTitle: { color: COLORS.ink, fontSize: 14, fontWeight: '700' },
  recordDivider: {
    backgroundColor: COLORS.track,
    height: StyleSheet.hairlineWidth,
    marginVertical: 14,
  },
  progressField: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  progressControl: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: '#D8D3CA',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    height: 32,
    justifyContent: 'center',
    width: 46,
  },
  progressInput: {
    color: COLORS.accent,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    height: 32,
    includeFontPadding: false,
    lineHeight: 20,
    padding: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
    width: 46,
  },
  progressTotal: {
    color: COLORS.muted,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    height: 32,
    includeFontPadding: false,
    lineHeight: 20,
    padding: 0,
    textAlign: 'left',
    textAlignVertical: 'center',
  },
  ratingRecord: { gap: 12 },
  ratingHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  currentRating: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  currentRatingText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  unsetText: {
    color: COLORS.subtle,
    fontSize: 11,
  },
  ratingOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratingOption: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: 'transparent',
    borderRadius: 10,
    borderWidth: 1,
    flexBasis: '17%',
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 38,
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
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 2,
  },
  inactiveNoticeText: {
    color: COLORS.subtle,
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
  },
  footerButton: {
    alignItems: 'center',
    borderRadius: 15,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  removeButton: { backgroundColor: COLORS.accentSoft },
  removeText: { color: COLORS.accent, fontSize: 14, fontWeight: '800' },
  saveButton: { backgroundColor: COLORS.accent },
  saveText: { color: COLORS.surface, fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.58 },
});
