import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';
import { RatingStars } from '@/features/reviews/rating-stars';
import { playSelectionHaptic } from '@/lib/haptics';
import { collectionInactiveNotice } from './collection-box-draft';
import type { useCollectionBoxForm } from './use-collection-box-form';

const RATING_OPTIONS = Array.from({ length: 10 }, (_, index) => index + 1);

export function CollectionBoxRecords({ editor, totalEpisodes, supportsProgress }: {
  editor: ReturnType<typeof useCollectionBoxForm>;
  totalEpisodes: number;
  supportsProgress: boolean;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const { form, patchForm, showsProgress, showsReadingProgress, canEditPersonalData, supportsReadingProgress, subjectType } = editor;
  const { watchedCount, readChapterCount, readVolumeCount, rating, status } = form;
  const progressTotalWidth = TYPE.body.lineHeight + String(totalEpisodes).length * TYPE.micro.fontSize;
  return (
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
                  value={`/ ${totalEpisodes}`}
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
                subjectType,
                supportsProgress,
                supportsReadingProgress,
              )}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: { marginTop: SPACING.lg },
  sectionLabel: {
    color: colors.muted,
    ...TYPE.caption,
    fontWeight: '700',
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  records: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    padding: SPACING.lg,
  },
  recordRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recordTitle: { color: colors.ink, ...TYPE.body, fontWeight: '700' },
  recordDivider: {
    backgroundColor: colors.divider,
    height: StyleSheet.hairlineWidth,
    marginVertical: SPACING.lg,
  },
  progressField: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
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
    ...TYPE.body,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    height: 32,
    includeFontPadding: false,
    padding: SPACING.none,
    textAlign: 'center',
    textAlignVertical: 'center',
    width: 46,
  },
  progressTotal: {
    color: colors.muted,
    ...TYPE.body,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    height: 32,
    includeFontPadding: false,
    padding: SPACING.none,
    textAlign: 'left',
    textAlignVertical: 'center',
  },
  readingFields: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.md,
  },
  readingField: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  readingInput: {
    backgroundColor: colors.surface,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.accent,
    ...TYPE.body,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    height: 32,
    includeFontPadding: false,
    padding: SPACING.none,
    textAlign: 'center',
    textAlignVertical: 'center',
    width: 48,
  },
  readingUnit: { color: colors.muted, ...TYPE.caption, fontWeight: '700' },
  ratingRecord: { gap: SPACING.md },
  ratingHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  currentRating: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  currentRatingText: {
    color: colors.muted,
    ...TYPE.micro,
    fontWeight: '700',
  },
  unsetText: {
    color: colors.subtle,
    ...TYPE.micro,
  },
  ratingOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
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
    ...TYPE.caption,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  selectedRatingOptionText: { color: colors.accent, fontWeight: '800' },
  inactiveNotice: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    minHeight: 46,
    paddingHorizontal: SPACING.xs / 2,
  },
  inactiveNoticeText: {
    color: colors.subtle,
    ...TYPE.caption,
  },
  pressed: { opacity: 0.58 },
});
