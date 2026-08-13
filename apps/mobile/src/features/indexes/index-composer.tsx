import { useEffect, useMemo, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { AppSheet } from '@/features/shared/app-sheet';
import { confirmDiscard } from '@/features/shared/confirm-discard';
import { useTheme } from '@/features/theme/theme-provider';
import { playSuccessHaptic } from '@/lib/haptics';

import { useCreateIndex, useUpdateIndex } from './use-create-index';

const MAX_TITLE_LENGTH = 200;
const MAX_DESC_LENGTH = 2000;

// 新建/编辑目录：标题 + 说明 + 可见范围，与话题/回复框共用 AppSheet。
export function IndexComposer({
  editing,
  onClose,
  onCreated,
  onEdited,
  visible,
}: {
  editing?: { desc: string; indexId: number; isPrivate: boolean; title: string } | null;
  onClose: () => void;
  onCreated?: (indexId: number) => void;
  onEdited?: () => void;
  visible: boolean;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const createIndex = useCreateIndex();
  const updateIndex = useUpdateIndex(editing?.indexId ?? 0);
  const isEditing = editing != null;
  const mutation = isEditing ? updateIndex : createIndex;
  const hasUnsavedChanges = editing
    ? title !== editing.title ||
      desc !== editing.desc ||
      isPrivate !== editing.isPrivate
    : Boolean(title.trim() || desc.trim() || isPrivate);
  const canPublish = title.trim().length > 0 && !mutation.isPending;

  useEffect(() => {
    if (!visible) {
      mutation.reset();
      return;
    }

    if (editing) {
      setTitle(editing.title);
      setDesc(editing.desc);
      setIsPrivate(editing.isPrivate);
    } else {
      setTitle('');
      setDesc('');
      setIsPrivate(false);
    }
  }, [visible]);

  function finishClose() {
    onClose();
  }

  function close() {
    if (mutation.isPending) {
      return;
    }

    if (hasUnsavedChanges) {
      confirmDiscard(finishClose);
      return;
    }

    finishClose();
  }

  function submit() {
    const nextTitle = title.trim();

    if (!nextTitle || mutation.isPending) {
      return;
    }

    const input = { desc: desc.trim(), isPrivate, title: nextTitle };

    if (isEditing && editing) {
      updateIndex.mutate(input, {
        onSuccess: () => {
          playSuccessHaptic();
          onEdited?.();
          onClose();
        },
      });
      return;
    }

    createIndex.mutate(input, {
      onSuccess: (result) => {
        playSuccessHaptic();
        setTitle('');
        setDesc('');
        setIsPrivate(false);
        onCreated?.(result.id);
      },
    });
  }

  return (
    <AppSheet
      onClose={close}
      swipeToDismissEnabled={!hasUnsavedChanges && !mutation.isPending}
      visible={visible}
    >
      <View
        style={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 18) },
        ]}
      >
        <View style={styles.heading}>
          <Pressable
            accessibilityLabel="关闭"
            accessibilityRole="button"
            disabled={mutation.isPending}
            hitSlop={8}
            onPress={close}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name={{ android: 'close', ios: 'xmark', web: 'close' }}
              size={17}
              tintColor={colors.muted}
              weight="semibold"
            />
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>
            {isEditing ? '编辑目录' : '新建目录'}
          </Text>
          <Pressable
            accessibilityLabel={isEditing ? '保存目录' : '创建目录'}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canPublish }}
            disabled={!canPublish}
            hitSlop={5}
            onPress={submit}
            style={({ pressed }) => [
              styles.publishButton,
              !canPublish && styles.publishButtonDisabled,
              pressed && canPublish && styles.pressed,
            ]}
          >
            {mutation.isPending ? (
              <ActivityIndicator color={colors.surface} size="small" />
            ) : (
              <Text style={styles.publishText}>
                {isEditing ? '保存' : '创建'}
              </Text>
            )}
          </Pressable>
        </View>

        <TextInput
          accessibilityLabel="目录标题"
          accessibilityHint={`最多输入 ${MAX_TITLE_LENGTH} 个字符`}
          autoFocus
          maxLength={MAX_TITLE_LENGTH}
          onChangeText={setTitle}
          placeholder="给目录起个名字"
          placeholderTextColor={colors.subtle}
          returnKeyType="next"
          style={styles.titleInput}
          value={title}
        />
        <TextInput
          accessibilityLabel="目录说明"
          accessibilityHint={`最多输入 ${MAX_DESC_LENGTH} 个字符`}
          maxLength={MAX_DESC_LENGTH}
          multiline
          onChangeText={setDesc}
          placeholder="说明这个目录收录了什么（可选）"
          placeholderTextColor={colors.subtle}
          scrollEnabled
          style={styles.bodyInput}
          textAlignVertical="top"
          value={desc}
        />

        <View style={styles.privacyRow}>
          <View style={styles.privacyCopy}>
            <Text style={styles.privacyTitle}>仅自己可见</Text>
            <Text style={styles.privacyDescription}>
              隐藏这个目录，不显示在公开列表
            </Text>
          </View>
          <Switch
            accessibilityLabel="仅自己可见"
            ios_backgroundColor={colors.track}
            onValueChange={setIsPrivate}
            trackColor={{ false: colors.track, true: colors.accentSoft }}
            value={isPrivate}
          />
        </View>

        {mutation.error ? (
          <Text accessibilityRole="alert" style={styles.errorText}>
            {mutation.error.message}
          </Text>
        ) : null}
      </View>
    </AppSheet>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: {},
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  title: {
    color: colors.ink,
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    marginHorizontal: 12,
    textAlign: 'center',
  },
  publishButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    minWidth: 62,
    paddingHorizontal: 14,
  },
  publishButtonDisabled: { opacity: 0.35 },
  publishText: { color: colors.surface, fontSize: 14, fontWeight: '800' },
  titleInput: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 18,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  bodyInput: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 23,
    minHeight: 120,
    paddingHorizontal: 2,
    paddingTop: 14,
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
  errorText: {
    color: colors.accent,
    fontSize: 12,
    lineHeight: 18,
    paddingTop: 8,
    textAlign: 'center',
  },
  pressed: { opacity: 0.62 },
});
