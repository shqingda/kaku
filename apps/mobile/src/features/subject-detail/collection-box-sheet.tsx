import { useRef } from 'react';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
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
import { AppSheet } from '@/features/shared/app-sheet';
import { useTheme } from '@/features/theme/theme-provider';
import type {
  CollectionStatus,
  WatchingItem,
} from '@/features/watching/model';

import type { CollectionBoxDraft } from './collection-box-draft';
import { SPACING, TYPE, HIT_SLOP } from '@/constants/design';
import { CollectionBoxRecords } from './collection-box-records';
import { useCollectionBoxForm } from './use-collection-box-form';
import { playSelectionHaptic } from '@/lib/haptics';

const STATUS_OPTIONS: CollectionStatus[] = [
  'wish',
  'completed',
  'doing',
  'onHold',
  'dropped',
];

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
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const contentScrollRef = useRef<ScrollView>(null);
  const editor = useCollectionBoxForm({ item, visible, supportsProgress, onClose, onSave });
  const { form, patchForm, requestClose, save, addTag, subjectType } = editor;
  const { comment, isPrivate, status, tagDraft, tags } = form;

  return (
    <AppSheet
      header={
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>
            收藏盒
          </Text>
          <Pressable
            accessibilityLabel="关闭收藏盒"
            accessibilityRole="button"
            hitSlop={HIT_SLOP}
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
      }
      onClose={requestClose}
      visible={visible}
    >
      <View
        style={{
          flexShrink: 1,
          paddingBottom: Math.max(insets.bottom, SPACING.lg),
        }}
      >
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
                      subjectType,
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
                      {getCollectionStatusLabel(subjectType, option)}
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

          <CollectionBoxRecords editor={editor} totalEpisodes={item.totalEpisodes} supportsProgress={supportsProgress} />

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
                    <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.tagText}>
                      {tag}
                    </Text>
                    <Pressable
                      accessibilityLabel={`删除标签 ${tag}`}
                      accessibilityRole="button"
                      hitSlop={HIT_SLOP}
                      onPress={() =>
                        patchForm({
                          tags: tags.filter(
                            (currentTag) => currentTag !== tag,
                          ),
                        })
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
  title: { color: colors.ink, ...TYPE.title, fontWeight: '800' },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  content: { paddingBottom: SPACING.md, paddingTop: SPACING.sm },
  section: { marginTop: SPACING.lg },
  sectionLabel: {
    color: colors.muted,
    ...TYPE.caption,
    fontWeight: '700',
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  statusOptions: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    padding: SPACING.xs,
  },
  statusOption: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: SPACING.md,
  },
  selectedStatusOption: { backgroundColor: colors.surface },
  statusText: { color: colors.ink, ...TYPE.body, fontWeight: '600' },
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
  commentInput: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    color: colors.ink,
    ...TYPE.body,
    minHeight: 92,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  tagsEditor: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    minHeight: 52,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  tagChip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    flexDirection: 'row',
    gap: SPACING.xs,
    height: 30,
    maxWidth: '100%',
    paddingHorizontal: SPACING.sm,
  },
  tagText: {
    color: colors.ink,
    flexShrink: 1,
    ...TYPE.caption,
    fontWeight: '700',
  },
  tagInput: {
    color: colors.ink,
    flexGrow: 1,
    ...TYPE.caption,
    height: 30,
    minWidth: 120,
    padding: SPACING.none,
  },
  privacyRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 64,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  privacyCopy: { flex: 1, gap: SPACING.xs, paddingRight: SPACING.lg },
  privacyTitle: { color: colors.ink, ...TYPE.body, fontWeight: '700' },
  privacyDescription: {
    color: colors.subtle,
    ...TYPE.micro,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACING.md,
    paddingTop: SPACING.md,
  },
  footerButton: {
    alignItems: 'center',
    borderRadius: 15,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  removeButton: { backgroundColor: colors.accentSoft },
  removeText: { color: colors.accent, ...TYPE.body, fontWeight: '800' },
  saveButton: { backgroundColor: colors.accent },
  saveText: { color: colors.surface, ...TYPE.body, fontWeight: '800' },
  disabledButton: { opacity: 0.46 },
  pressed: { opacity: 0.58 },
});
