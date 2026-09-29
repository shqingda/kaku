import { userErrorMessage } from '@/lib/user-error-message';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
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

import { SPACING, TYPE, HIT_SLOP, MIN_TOUCH_SIZE } from '@/constants/design';
import { useAuth } from '@/features/auth/auth-provider';
import { useReplyDraft } from '@/features/discussions/use-reply-draft';
import type { ThemeColors } from '@/constants/theme';
import { AppSheet } from '@/features/shared/app-sheet';
import { confirmDiscard } from '@/features/shared/confirm-discard';
import { useTheme } from '@/features/theme/theme-provider';
import { playSuccessHaptic } from '@/lib/haptics';

import { useCreateIndex, useUpdateIndex } from './use-create-index';

const MAX_TITLE_LENGTH = 200;
const MAX_DESC_LENGTH = 2000;

// 新建/编辑目录：标题 + 说明 + 可见范围，与话题/回复框共用 AppSheet。
export function IndexComposer(props: Omit<ComponentProps<typeof IndexComposerContent>, 'draftKey'>) {
  const { session } = useAuth();
  const [opening, setOpening] = useState({ visible: props.visible, generation: 0 });
  if (opening.visible !== props.visible) {
    setOpening({ visible: props.visible, generation: opening.generation + (props.visible ? 1 : 0) });
  }
  if (!session) return null;
  const key = `kaku:index-draft:v1:${session.user.id}:${props.editing?.indexId ?? 'new'}`;
  return <IndexComposerContent {...props} key={`${key}:${opening.generation}`} draftKey={props.editing ? null : key} />;
}

type IndexFields = { title: string; desc: string; isPrivate: boolean };
const EMPTY_INDEX: IndexFields = { title: '', desc: '', isPrivate: false };
function readIndexDraft(raw: string): IndexFields | null {
  if (!raw) return EMPTY_INDEX;
  try {
    const value = JSON.parse(raw);
    return typeof value?.title === 'string' && typeof value?.desc === 'string' && typeof value?.isPrivate === 'boolean' ? value : null;
  } catch { return null; }
}

function IndexComposerContent({
  draftKey,
  editing,
  onClose,
  onCreated,
  onEdited,
  visible,
}: {
  draftKey: string | null;
  editing?: { desc: string; indexId: number; isPrivate: boolean; title: string } | null;
  onClose: () => void;
  onCreated?: (indexId: number) => void;
  onEdited?: () => void;
  visible: boolean;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const draft = useReplyDraft(draftKey, editing ? JSON.stringify(editing) : '', visible, '目录已保存');
  const fields = readIndexDraft(draft.content);
  const { title, desc, isPrivate } = fields ?? EMPTY_INDEX;
  const sent = draft.phase === 'sent';
  const inputRef = useRef<TextInput>(null);
  const mounted = useRef(true);
  const submitting = useRef(false);
  const createdId = useRef<number | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  function change(update: Partial<IndexFields>) {
    draft.change(raw => {
      const previous = readIndexDraft(raw);
      if (!previous) return raw;
      const next = { ...previous, ...update };
      return next.title || next.desc || next.isPrivate ? JSON.stringify(next) : '';
    });
  }
  const createIndex = useCreateIndex();
  const updateIndex = useUpdateIndex(editing?.indexId ?? 0);
  const isEditing = editing != null;
  const mutation = isEditing ? updateIndex : createIndex;
  const hasUnsavedChanges = editing
    ? title !== editing.title ||
      desc !== editing.desc ||
      isPrivate !== editing.isPrivate
    : Boolean(title.trim() || desc.trim() || isPrivate);
  const canPublish = title.trim().length > 0 && !mutation.isPending && draft.loaded && fields !== null && !sent;
  const editable = draft.loaded && fields !== null && !mutation.isPending && !sent;

  function finishClose() {
    onClose();
  }

  function close() {
    if (mutation.isPending) {
      return;
    }

    if (!isEditing) {
      if (draft.dismiss()) {
        if (createdId.current !== null) onCreated?.(createdId.current);
        finishClose();
      }
      return;
    }
    if (hasUnsavedChanges) {
      confirmDiscard(finishClose);
      return;
    }

    finishClose();
  }

  function submit() {
    if (!canPublish || submitting.current) return;
    submitting.current = true;
    const input = { desc: desc.trim(), isPrivate, title: title.trim() };
    const task = isEditing
      ? updateIndex.mutateAsync(input).then(() => null)
      : createIndex.mutateAsync(input).then(result => result.id);
    void task.then((id) => {
      createdId.current = id;
      const cleared = draft.complete();
      if (!mounted.current) return;
      playSuccessHaptic();
      if (cleared) {
        if (isEditing) onEdited?.();
        else if (id !== null) onCreated?.(id);
        finishClose();
      }
    }).catch(() => {
      // Keep content on failure; the mutation renders its error below.
    }).finally(() => { submitting.current = false; });
  }

  return (
    <AppSheet
      header={
        <View style={styles.heading}>
          <Pressable
            accessibilityLabel="关闭"
            accessibilityRole="button"
            disabled={mutation.isPending}
            hitSlop={HIT_SLOP}
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
            hitSlop={HIT_SLOP}
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
      }
      onClose={close}
      swipeToDismissEnabled={!mutation.isPending && !draft.error && (!isEditing || !hasUnsavedChanges)}
      visible={visible}
    >
      <View
        style={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, SPACING.lg) },
        ]}
      >
        <TextInput
          accessibilityLabel="目录标题"
          accessibilityHint={`最多输入 ${MAX_TITLE_LENGTH} 个字符`}
          autoFocus
          maxLength={MAX_TITLE_LENGTH}
          editable={editable}
          onChangeText={(title) => change({ title })}
          onSubmitEditing={() => inputRef.current?.focus()}
          submitBehavior="submit"
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
          editable={editable}
          ref={inputRef}
          onChangeText={(desc) => change({ desc })}
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
            disabled={!editable}
            onValueChange={(isPrivate) => change({ isPrivate })}
            trackColor={{ false: colors.track, true: colors.accentSoft }}
            value={isPrivate}
          />
        </View>

        {!isEditing && draft.content && !sent && !mutation.isPending ? (
          <Pressable accessibilityRole="button" style={styles.draftAction} onPress={() => confirmDiscard(() => { if (draft.clear()) finishClose(); })}>
            <Text style={styles.privacyDescription}>丢弃草稿</Text>
          </Pressable>
        ) : null}
        {!isEditing && draft.content && fields && !draft.error && !sent ? <Text style={styles.privacyDescription}>草稿已保存在本机</Text> : null}
        {fields === null ? <Text accessibilityRole="alert" style={styles.errorText}>草稿格式无法读取，原内容已保留；可丢弃后重新编辑。</Text> : null}
        {draft.error ? (
          <Pressable accessibilityRole="button" style={styles.draftAction} onPress={() => {
            if (draft.retry() && sent) {
              if (createdId.current !== null) onCreated?.(createdId.current);
              finishClose();
            }
          }}><Text accessibilityRole="alert" style={styles.errorText}>{draft.error} · 重试</Text></Pressable>
        ) : null}
        {mutation.error ? (
          <Text accessibilityRole="alert" style={styles.errorText}>
            {userErrorMessage(mutation.error)}
          </Text>
        ) : null}
      </View>
    </AppSheet>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: {},
  draftAction: { minHeight: MIN_TOUCH_SIZE, justifyContent: 'center' },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 17,
    minHeight: MIN_TOUCH_SIZE,
    justifyContent: 'center',
    width: MIN_TOUCH_SIZE,
  },
  title: {
    color: colors.ink,
    flex: 1,
    ...TYPE.heading,
    fontWeight: '800',
    marginHorizontal: SPACING.md,
    textAlign: 'center',
  },
  publishButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 17,
    minHeight: MIN_TOUCH_SIZE,
    justifyContent: 'center',
    minWidth: 62,
    paddingHorizontal: SPACING.lg,
  },
  publishButtonDisabled: { opacity: 0.35 },
  publishText: { color: colors.surface, ...TYPE.body, fontWeight: '800' },
  titleInput: {
    color: colors.ink,
    ...TYPE.heading,
    fontWeight: '700',
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
  },
  bodyInput: {
    color: colors.ink,
    ...TYPE.body,
    lineHeight: TYPE.body.lineHeight,
    minHeight: 120,
    paddingHorizontal: SPACING.xs,
    paddingTop: SPACING.lg,
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
    lineHeight: TYPE.micro.lineHeight,
  },
  errorText: {
    color: colors.accent,
    ...TYPE.caption,
    lineHeight: TYPE.caption.lineHeight,
    paddingTop: SPACING.sm,
    textAlign: 'center',
  },
  pressed: { opacity: 0.62 },
});
