import { userErrorMessage } from '@/lib/user-error-message';
import { useEffect, useMemo, useRef, useState } from 'react';
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
export function TopicComposer({
  onClose,
  onCreated,
  target,
  visible,
}: {
  onClose: () => void;
  onCreated: (topicId: number) => void;
  target: TopicComposerTarget;
  visible: boolean;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const titleInputRef = useRef<TextInput>(null);
  const contentInputRef = useRef<TextInput>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
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
  const hasUnsavedChanges = Boolean(title.trim() || content.trim());
  const canPublish =
    title.trim().length > 0 &&
    content.trim().length > 0 &&
    !mutation.isPending;

  useEffect(() => {
    if (!visible) {
      mutation.reset();
      setTitle('');
      setContent('');
    }
  }, [visible]);

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

    if (hasUnsavedChanges) {
      confirmDiscard(finishClose);
      return;
    }

    finishClose();
  }

  function submit() {
    const nextTitle = title.trim();
    const nextContent = content.trim();

    if (!nextTitle || !nextContent || mutation.isPending) {
      return;
    }

    mutation.mutate(
      { content: nextContent, title: nextTitle },
      {
        onSuccess: (topic) => {
          playSuccessHaptic();
          Keyboard.dismiss();
          setTitle('');
          setContent('');
          onCreated(topic.id);
        },
      },
    );
  }

  return (
    <AppSheet
      onClose={close}
      onShow={focusTitle}
      swipeToDismissEnabled={!hasUnsavedChanges && !mutation.isPending}
      visible={visible}
    >
      <View
        style={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 16) },
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
            新建话题
          </Text>
          <Pressable
            accessibilityLabel="发布话题"
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
              <Text style={styles.publishText}>发布</Text>
            )}
          </Pressable>
        </View>

        <TextInput
          accessibilityLabel="话题标题"
          accessibilityHint={`最多输入 ${MAX_TITLE_LENGTH} 个字符`}
          autoFocus
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

        <BangumiRichTextToolbar onInsert={insertText} />

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
    minHeight: 140,
    paddingHorizontal: 2,
    paddingTop: 14,
  },
  footer: {
    alignItems: 'center',
    borderTopColor: colors.track,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  hint: { color: colors.muted, fontSize: 11 },
  count: { color: colors.muted, fontSize: 11, fontVariant: ['tabular-nums'] },
  errorText: {
    color: colors.accent,
    fontSize: 12,
    lineHeight: 18,
    paddingBottom: 8,
  },
  pressed: { opacity: 0.62 },
});
