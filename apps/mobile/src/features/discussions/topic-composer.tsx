import { userErrorMessage } from '@/lib/user-error-message';
import { useEffect, useRef, useState, type ComponentProps, type SetStateAction } from 'react';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SPACING, TYPE, HIT_SLOP, MIN_TOUCH_SIZE } from '@/constants/design';
import { useAuth } from '@/features/auth/auth-provider';
import { useReplyDraft } from './use-reply-draft';
import type { ThemeColors } from '@/constants/theme';
import { BangumiRichTextToolbar } from '@/features/emoji-picker/bangumi-emoji-picker';
import { useBangumiEmojiInsertion } from '@/features/emoji-picker/use-bangumi-emoji-insertion';
import { AppSheet } from '@/features/shared/app-sheet';
import { confirmDiscard } from '@/features/shared/confirm-discard';
import { useTheme } from '@/features/theme/theme-provider';
import { playSuccessHaptic } from '@/lib/haptics';

import { useCreateGroupTopic, useCreateSubjectTopic } from './use-create-topic';

const MAX_TITLE_LENGTH = 120;
const MAX_CONTENT_LENGTH = 5000;

export type TopicComposerTarget =
  | { groupName: string; kind: 'group' }
  | { kind: 'subject'; subjectId: number };

// 新建话题：标题 + 内容，与回复框共用 AppSheet（同一运动与键盘行为）。
// 发布需要一次 Bangumi Turnstile 验证，成功后才关闭并跳转新话题。
export function TopicComposer(props: Omit<ComponentProps<typeof TopicComposerContent>, 'draftKey'>) {
  const { session } = useAuth();
  const [opening, setOpening] = useState({ visible: props.visible, generation: 0 });
  if (opening.visible !== props.visible) {
    setOpening({ visible: props.visible, generation: opening.generation + (props.visible ? 1 : 0) });
  }
  if (!session) return null;
  const targetId = props.target.kind === 'group' ? props.target.groupName : props.target.subjectId;
  const draftKey = `kaku:topic-draft:v1:${JSON.stringify([session.user.id, props.target.kind, targetId])}`;
  return <TopicComposerContent {...props} key={`${draftKey}:${opening.generation}`} draftKey={draftKey} />;
}

function readTopicDraft(raw: string): { title: string; content: string } | null {
  if (!raw) return { title: '', content: '' };
  try {
    const value = JSON.parse(raw);
    return typeof value?.title === 'string' && typeof value?.content === 'string' ? value : null;
  } catch { return null; }
}

function TopicComposerContent({
  draftKey,
  onClose,
  onCreated,
  target,
  visible,
}: {
  draftKey: string;
  onClose: () => void;
  onCreated: (topicId: number) => void;
  target: TopicComposerTarget;
  visible: boolean;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const titleInputRef = useRef<TextInput>(null);
  const contentInputRef = useRef<TextInput>(null);
  const draft = useReplyDraft(draftKey, '', visible, '话题已发布');
  const parsed = readTopicDraft(draft.content);
  const { title, content } = parsed ?? { title: '', content: '' };
  const sent = draft.phase === 'sent';
  const mounted = useRef(true);
  const createdId = useRef<number | null>(null);
  const submitting = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  function changeField(field: 'title' | 'content', value: SetStateAction<string>) {
    draft.change((raw) => {
      const previous = readTopicDraft(raw);
      if (!previous) return raw;
      const next = { ...previous, [field]: typeof value === 'function' ? value(previous[field]) : value };
      return next.title || next.content ? JSON.stringify(next) : '';
    });
  }
  function setTitle(value: string) { changeField('title', value); }
  function setContent(value: SetStateAction<string>) { changeField('content', value); }
  const { insertText, onSelectionChange } = useBangumiEmojiInsertion(
    contentInputRef,
    content,
    setContent,
    MAX_CONTENT_LENGTH,
  );
  // 两个 mutation 都注册（hook 顺序稳定），提交时按目标类型选择。
  const createSubjectTopic = useCreateSubjectTopic(
    target.kind === 'subject' ? target.subjectId : 0,
  );
  const createGroupTopic = useCreateGroupTopic(
    target.kind === 'group' ? target.groupName : '',
  );
  const mutation =
    target.kind === 'subject' ? createSubjectTopic : createGroupTopic;
  const canPublish =
    title.trim().length > 0 &&
    content.trim().length > 0 &&
    !mutation.isPending && draft.loaded && parsed !== null && !sent;
  const editable = draft.loaded && parsed !== null && !mutation.isPending && !sent;

  // iOS 上 Modal 内的 autoFocus 不可靠，弹层显示完成后再聚焦标题框弹出键盘。
  function focusTitle() {
    requestIdleCallback(() => titleInputRef.current?.focus(), { timeout: 200 });
  }

  function finishClose() {
    Keyboard.dismiss();
    onClose();
  }

  function close() {
    if (mutation.isPending) {
      return;
    }

    if (draft.dismiss()) {
      if (createdId.current !== null) onCreated(createdId.current);
      else finishClose();
    }
  }

  function submit() {
    if (!canPublish || submitting.current) return;
    submitting.current = true;
    void mutation.mutateAsync({ content: content.trim(), title: title.trim() }).then((topic) => {
      createdId.current = topic.id;
      const cleared = draft.complete();
      if (!mounted.current) return;
      playSuccessHaptic();
      if (cleared) { Keyboard.dismiss(); onCreated(topic.id); }
    }).catch(() => {
      // Mutation error is shown below; keep the local draft for retry.
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
            新建话题
          </Text>
          <Pressable
            accessibilityLabel="发布话题"
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
              <Text style={styles.publishText}>发布</Text>
            )}
          </Pressable>
        </View>
      }
      onClose={close}
      onShow={focusTitle}
      swipeToDismissEnabled={!mutation.isPending && !draft.error}
      visible={visible}
    >
      <View
        style={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, SPACING.lg) },
        ]}
      >
        <TextInput
          accessibilityLabel="话题标题"
          accessibilityHint={`最多输入 ${MAX_TITLE_LENGTH} 个字符`}
          autoFocus
          editable={editable}
          onSubmitEditing={() => contentInputRef.current?.focus()}
          submitBehavior="submit"
          maxLength={MAX_TITLE_LENGTH}
          onChangeText={setTitle}
          placeholder="写一个清楚的话题标题"
          placeholderTextColor={colors.subtle}
          ref={titleInputRef}
          returnKeyType="next"
          style={styles.titleInput}
          value={title}
        />
        <TextInput
          accessibilityLabel="话题内容"
          accessibilityHint={`最多输入 ${MAX_CONTENT_LENGTH} 个字符`}
          editable={editable}
          maxLength={MAX_CONTENT_LENGTH}
          multiline
          onChangeText={setContent}
          onSelectionChange={onSelectionChange}
          ref={contentInputRef}
          placeholder="友善地描述你想讨论的内容…"
          placeholderTextColor={colors.subtle}
          scrollEnabled
          style={styles.bodyInput}
          textAlignVertical="top"
          value={content}
        />

        {editable ? <BangumiRichTextToolbar onInsert={insertText} /> : null}
        {draft.content && !sent && !mutation.isPending ? (
          <Pressable accessibilityRole="button" onPress={() => confirmDiscard(() => { if (draft.clear()) finishClose(); })} style={styles.draftAction}>
            <Text style={styles.hint}>丢弃草稿</Text>
          </Pressable>
        ) : null}
        {draft.content && !draft.error && parsed && !sent ? <Text style={styles.hint}>草稿已保存在本机</Text> : null}
        {parsed === null ? <Text accessibilityRole="alert" style={styles.errorText}>草稿格式无法读取，原内容已保留；可丢弃后重新编辑。</Text> : null}
        {draft.error ? (
          <Pressable accessibilityRole="button" style={styles.draftAction} onPress={() => {
            if (draft.retry() && sent && createdId.current !== null) onCreated(createdId.current);
          }}><Text accessibilityRole="alert" style={styles.errorText}>{draft.error} · 重试</Text></Pressable>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.hint}>发布时完成一次 Bangumi 安全验证</Text>
          <Text style={styles.count}>
            {content.length}/{MAX_CONTENT_LENGTH}
          </Text>
        </View>
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
    minHeight: 140,
    paddingHorizontal: SPACING.xs,
    paddingTop: SPACING.lg,
  },
  footer: {
    alignItems: 'center',
    borderTopColor: colors.track,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'space-between',
    minHeight: MIN_TOUCH_SIZE,
  },
  hint: { flexShrink: 1, color: colors.muted, ...TYPE.micro },
  count: { color: colors.muted, ...TYPE.micro, fontVariant: ['tabular-nums'] },
  errorText: {
    color: colors.accent,
    ...TYPE.caption,
    lineHeight: TYPE.caption.lineHeight,
    paddingBottom: SPACING.sm,
  },
  pressed: { opacity: 0.62 },
});
