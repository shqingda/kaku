import { useEffect, useMemo, useRef, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { getCollectionStatusLabel } from '@/features/catalog/subject-types';
import { RatingStars } from '@/features/reviews/rating-stars';
import { AppSheet } from '@/features/shared/app-sheet';
import { useTheme } from '@/features/theme/theme-provider';
import type {
  CollectionStatus,
  WatchingItem,
} from '@/features/watching/model';
import { canRateCollectionStatus } from '@/features/watching/progress';

import {
  collectionBoxBaselineFromItem,
  collectionBoxDraftFromForm,
  collectionBoxFormFromItem,
  collectionInactiveNotice,
  isCollectionBoxFormDirty,
  type CollectionBoxDraft,
  type CollectionBoxForm,
} from './collection-box-draft';
import { playSelectionHaptic } from '@/lib/haptics';

export type { CollectionBoxDraft };

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
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const contentScrollRef = useRef<ScrollView>(null);
  const [form, setForm] = useState<CollectionBoxForm>(() =>
    collectionBoxFormFromItem(item),
  );
  const {
    comment,
    isPrivate,
    rating,
    readChapterCount,
    readVolumeCount,
    status,
    tagDraft,
    tags,
    watchedCount,
  } = form;
  const canEditPersonalData = canRateCollectionStatus(status);
  const showsProgress =
    canEditPersonalData && supportsProgress && item.totalEpisodes > 0;
  const showsReadingProgress =
    canEditPersonalData &&
    item.readChapterCount !== undefined &&
    item.readVolumeCount !== undefined;
  const progressDigits = String(item.totalEpisodes).length;
  const progressTotalWidth = 22 + progressDigits * 10;

  const baselineRef = useRef<CollectionBoxDraft | null>(null);
  const isDirty = useMemo(
    () => isCollectionBoxFormDirty(form, baselineRef.current),
    [form],
  );

  function patchForm(patch: Partial<CollectionBoxForm>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function requestClose() {
    if (isDirty) {
      Alert.alert(
        '放弃未保存的修改？',
        '收藏盒里的改动还没有保存，关闭后不会保留。',
        [
          { style: 'cancel', text: '继续编辑' },
          { style: 'destructive', text: '放弃修改', onPress: onClose },
        ],
      );
      return;
    }
    onClose();
  }

  useEffect(() => {
    if (!visible) {
      return;
    }

    setForm(collectionBoxFormFromItem(item));
    baselineRef.current = collectionBoxBaselineFromItem(item);
  }, [
    item.collectionStatus,
    item.rating,
    item.comment,
    item.isPrivate,
    item.readChapterCount,
    item.readVolumeCount,
    item.tags,
    item.watchedEpisodeNumbers.length,
    visible,
  ]);

  function save() {
    onSave(collectionBoxDraftFromForm(form, item, showsProgress));
  }

  function addTag() {
    const nextTag = tagDraft.trim();

    if (!nextTag || tags.includes(nextTag)) {
      patchForm({ tagDraft: '' });
      return;
    }

    setForm((current) => ({
      ...current,
      tagDraft: '',
      tags: [...current.tags, nextTag],
    }));
  }

  return (
    <AppSheet onClose={requestClose} visible={visible}>
      <View
        style={{
          flexShrink: 1,
          paddingBottom: Math.max(insets.bottom, 18),
        }}
      >
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>
            收藏盒
          </Text>
          <Pressable
            accessibilityLabel="关闭收藏盒"
            accessibilityRole="button"
            hitSlop={8}
            onPress={requestClose}
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
              tintColor={colors.muted}
              weight="semibold"
            />
          </Pressable>
        </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            ref={contentScrollRef}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>收藏状态</Text>
              <View
                accessibilityLabel="收藏状态"
                accessibilityRole="radiogroup"
                style={styles.statusOptions}
              >
                {STATUS_OPTIONS.map((option) => {
                  const isSelected = status === option;

                  return (
                    <Pressable
                      accessibilityLabel={getCollectionStatusLabel(
                        item.type ?? 2,
                        option,
                      )}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      key={option}
                      onPress={() => {
                        playSelectionHaptic();
                        patchForm({ status: option });
                      }}
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
                            tintColor={colors.surface}
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
                              patchForm({
                                watchedCount: value.replace(/\D/g, ''),
                              })
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

                {showsReadingProgress ? (
                  <>
                    <View style={styles.recordRow}>
                      <Text style={styles.recordTitle}>阅读进度</Text>
                      <View style={styles.readingFields}>
                        <View style={styles.readingField}>
                          <TextInput
                            accessibilityLabel="已读章节"
                            keyboardType="number-pad"
                            onChangeText={(value) =>
                              patchForm({
                                readChapterCount: value.replace(/\D/g, ''),
                              })
                            }
                            selectTextOnFocus
                            style={styles.readingInput}
                            value={readChapterCount}
                          />
                          <Text style={styles.readingUnit}>章</Text>
                        </View>
                        <View style={styles.readingField}>
                          <TextInput
                            accessibilityLabel="已读卷数"
                            keyboardType="number-pad"
                            onChangeText={(value) =>
                              patchForm({
                                readVolumeCount: value.replace(/\D/g, ''),
                              })
                            }
                            selectTextOnFocus
                            style={styles.readingInput}
                            value={readVolumeCount}
                          />
                          <Text style={styles.readingUnit}>卷</Text>
                        </View>
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
                            onPress={() => {
                              playSelectionHaptic();
                              patchForm({
                                rating: isSelected ? undefined : option,
                              });
                            }}
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
                      tintColor={colors.subtle}
                    />
                    <Text style={styles.inactiveNoticeText}>
                      {collectionInactiveNotice(
                        status,
                        item.type ?? 2,
                        supportsProgress,
                        item.readChapterCount !== undefined,
                      )}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {item.comment !== undefined ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>吐槽</Text>
                <TextInput
                  accessibilityLabel="吐槽"
                  maxLength={1000}
                  multiline
                  onChangeText={(value) => patchForm({ comment: value })}
                  onFocus={() => {
                    setTimeout(() => {
                      contentScrollRef.current?.scrollToEnd({ animated: true });
                    }, 250);
                  }}
                  placeholder="写下你对这个条目的简短记录"
                  placeholderTextColor={colors.subtle}
                  style={styles.commentInput}
                  textAlignVertical="top"
                  value={comment}
                />
              </View>
            ) : null}

            {item.tags !== undefined ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>收藏标签</Text>
                <View style={styles.tagsEditor}>
                  {tags.map((tag) => (
                    <View key={tag} style={styles.tagChip}>
                      <Text numberOfLines={1} style={styles.tagText}>
                        {tag}
                      </Text>
                      <Pressable
                        accessibilityLabel={`删除标签 ${tag}`}
                        accessibilityRole="button"
                        hitSlop={6}
                        onPress={() =>
                          setForm((current) => ({
                            ...current,
                            tags: current.tags.filter(
                              (currentTag) => currentTag !== tag,
                            ),
                          }))
                        }
                      >
                        <SymbolView
                          name={{
                            android: 'close',
                            ios: 'xmark',
                            web: 'close',
                          }}
                          size={10}
                          tintColor={colors.muted}
                          weight="semibold"
                        />
                      </Pressable>
                    </View>
                  ))}
                  <TextInput
                    accessibilityLabel="添加收藏标签"
                    autoCapitalize="none"
                    onChangeText={(value) =>
                      patchForm({ tagDraft: value.replace(/\s/g, '') })
                    }
                    onSubmitEditing={addTag}
                    placeholder={
                      tags.length === 0 ? '输入标签后按回车' : '添加标签'
                    }
                    placeholderTextColor={colors.subtle}
                    returnKeyType="done"
                    style={styles.tagInput}
                    value={tagDraft}
                  />
                </View>
              </View>
            ) : null}

            {item.isPrivate !== undefined ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>可见范围</Text>
                <View style={styles.privacyRow}>
                  <View style={styles.privacyCopy}>
                    <Text style={styles.privacyTitle}>仅自己可见</Text>
                    <Text style={styles.privacyDescription}>
                      隐藏这条收藏记录
                    </Text>
                  </View>
                  <Switch
                    accessibilityLabel="仅自己可见"
                    ios_backgroundColor={colors.track}
                    onValueChange={(value) => patchForm({ isPrivate: value })}
                    trackColor={{
                      false: colors.track,
                      true: colors.accentSoft,
                    }}
                    value={isPrivate}
                  />
                </View>
              </View>
            ) : null}
            <View style={styles.footer}>
              {item.collectionStatus ? (
                <Pressable
                  accessibilityLabel="取消收藏"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isSaving }}
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
                accessibilityLabel={status ? '保存收藏' : '请先选择收藏状态'}
                accessibilityRole="button"
                accessibilityState={{ disabled: !status || isSaving }}
                disabled={!status || isSaving}
                onPress={save}
                style={({ pressed }) => [
                  styles.footerButton,
                  styles.saveButton,
                  (!status || isSaving) && styles.disabledButton,
                  pressed && styles.pressed,
                ]}
              >
                {isSaving ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <Text style={styles.saveText}>
                    {status ? '保存' : '选择状态'}
                  </Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
    </AppSheet>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  content: { paddingBottom: 12, paddingTop: 8 },
  section: { marginTop: 16 },
  sectionLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
  },
  statusOptions: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    padding: 4,
  },
  statusOption: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  selectedStatusOption: { backgroundColor: colors.surface },
  statusText: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  selectedStatusText: { color: colors.accent, fontWeight: '800' },
  selectionIndicator: {
    alignItems: 'center',
    borderColor: colors.track,
    borderRadius: 9,
    borderWidth: 1,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  selectedIndicator: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  records: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    padding: 14,
  },
  recordRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recordTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  recordDivider: {
    backgroundColor: colors.divider,
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
    backgroundColor: colors.surface,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    height: 32,
    justifyContent: 'center',
    width: 46,
  },
  progressInput: {
    color: colors.accent,
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
    color: colors.muted,
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
  readingFields: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  readingField: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  readingInput: {
    backgroundColor: colors.surface,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.accent,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    height: 32,
    includeFontPadding: false,
    lineHeight: 20,
    padding: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
    width: 48,
  },
  readingUnit: { color: colors.muted, fontSize: 12, fontWeight: '700' },
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
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  unsetText: {
    color: colors.subtle,
    fontSize: 11,
  },
  ratingOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratingOption: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: 'transparent',
    borderRadius: 10,
    borderWidth: 1,
    flexBasis: '17%',
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  selectedRatingOption: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  ratingOptionText: {
    color: colors.muted,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  selectedRatingOptionText: { color: colors.accent, fontWeight: '800' },
  inactiveNotice: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 2,
  },
  inactiveNoticeText: {
    color: colors.subtle,
    fontSize: 12,
    lineHeight: 18,
  },
  commentInput: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 92,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  tagsEditor: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 52,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  tagChip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 5,
    height: 30,
    maxWidth: '100%',
    paddingHorizontal: 9,
  },
  tagText: {
    color: colors.ink,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  tagInput: {
    color: colors.ink,
    flexGrow: 1,
    fontSize: 13,
    height: 30,
    minWidth: 120,
    padding: 0,
  },
  privacyRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  privacyCopy: { flex: 1, gap: 4, paddingRight: 16 },
  privacyTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  privacyDescription: {
    color: colors.subtle,
    fontSize: 11,
    lineHeight: 16,
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
  removeButton: { backgroundColor: colors.accentSoft },
  removeText: { color: colors.accent, fontSize: 14, fontWeight: '800' },
  saveButton: { backgroundColor: colors.accent },
  saveText: { color: colors.surface, fontSize: 15, fontWeight: '800' },
  disabledButton: { opacity: 0.46 },
  pressed: { opacity: 0.58 },
});
