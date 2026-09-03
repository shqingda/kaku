import { useEffect, useRef, useState } from 'react';
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

import type { DiscussionReply } from './model';
import {
  useDiscussionReply,
  type DiscussionReplyTarget,
} from './use-discussion-reply';

const MAX_CONTENT_LENGTH = 5000;

export function DiscussionReplyComposer({
  editing,
  onClose,
  onEdited,
  replyingTo,
  target,
  visible,
}: {
  editing?: { content: string; postId: number } | null;
  onClose: () => void;
  onEdited?: () => void;
  replyingTo?: DiscussionReply;
  target: DiscussionReplyTarget;
  visible: boolean;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [content, setContent] = useState('');
  const { insertText, onSelectionChange } = useBangumiEmojiInsertion(
    inputRef,
    content,
    setContent,
    MAX_CONTENT_LENGTH,
  );
  const { create: createReply, edit: editReply } = useDiscussionReply(target);
  const isEditing = editing != null;
  const pending = createReply.isPending || editReply.isPending;
  const hasUnsavedChanges = isEditing
    ? content !== editing.content
    : Boolean(content.trim());
  const canSend = content.trim().length > 0 && !pending;
  const displayError = createReply.error ?? editReply.error;

  useEffect(() => {
    if (!visible) {
      createReply.reset();
      editReply.reset();
      return;
    }

    if (editing) {
      setContent(editing.content);
    } else {
      setContent('');
    }
  }, [visible]);

  function finishClose() {
    Keyboard.dismiss();
    onClose();
  }

  // iOS 上 Modal 内的 autoFocus 不可靠，弹层显示完成后再聚焦输入框弹出键盘。
  function focusInput() {
    requestIdleCallback(() => inputRef.current?.focus(), { timeout: 200 });
  }

  function close() {
    if (pending) {
      return;
    }

    if (hasUnsavedChanges) {
      confirmDiscard(finishClose);
      return;
    }

    finishClose();
  }

  function send() {
    const nextContent = content.trim();

    if (!nextContent || pending) {
      return;
    }

    if (isEditing && editing) {
      editReply.mutate(
        { content: nextContent, postId: editing.postId },
        {
          onSuccess: () => {
            playSuccessHaptic();
            Keyboard.dismiss();
            setContent('');
            onEdited?.();
            onClose();
          },
        },
      );
      return;
    }

    createReply.mutate(
      {
        content: nextContent,
        replyTo: replyingTo ? Number(replyingTo.id) : undefined,
      },
      {
        onSuccess: () => {
          playSuccessHaptic();
          Keyboard.dismiss();
          setContent('');
          onClose();
        },
      },
    );
  }

  return (
    <AppSheet
      onClose={close}
      onShow={focusInput}
      swipeToDismissEnabled={!hasUnsavedChanges && !pending}
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
              disabled={pending}
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
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.title}>
              {isEditing
                ? '编辑回复'
                : replyingTo
                  ? `回复 ${replyingTo.author}`
                  : '参与讨论'}
            </Text>
            <Pressable
              accessibilityLabel={isEditing ? '保存回复' : '发送回复'}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSend }}
              disabled={!canSend}
              hitSlop={5}
              onPress={send}
              style={({ pressed }) => [
                styles.sendButton,
                !canSend && styles.sendButtonDisabled,
                pressed && canSend && styles.pressed,
              ]}
            >
              {pending ? (
                <ActivityIndicator color={colors.surface} size="small" />
              ) : (
                <Text style={styles.sendText}>
                  {isEditing ? '保存' : '回复'}
                </Text>
              )}
            </Pressable>
          </View>

          {replyingTo && !isEditing ? (
            <View style={styles.reference}>
              <Text style={styles.referenceAuthor}>@{replyingTo.author}</Text>
              <Text numberOfLines={2} style={styles.referenceBody}>
                {replyingTo.body}
              </Text>
            </View>
          ) : null}

          <TextInput
            accessibilityLabel="回复内容"
            accessibilityHint={`最多输入 ${MAX_CONTENT_LENGTH} 个字符`}
            autoFocus
            maxLength={MAX_CONTENT_LENGTH}
            multiline
            onChangeText={setContent}
            onSelectionChange={onSelectionChange}
            placeholder="友善地参与讨论…"
            placeholderTextColor={colors.subtle}
            ref={inputRef}
            scrollEnabled
            showSoftInputOnFocus
            style={styles.input}
            textAlignVertical="top"
            value={content}
          />

          <BangumiRichTextToolbar onInsert={insertText} />

          <View style={styles.footer}>
            <Text style={styles.hint}>
              {isEditing ? '编辑会直接保存到 Bangumi' : '发送时完成一次 Bangumi 安全验证'}
            </Text>
            <Text style={styles.count}>{content.length}/{MAX_CONTENT_LENGTH}</Text>
          </View>
          {displayError ? (
            <Text accessibilityRole="alert" style={styles.errorText}>
              {displayError.message}
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
  sendButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    minWidth: 62,
    paddingHorizontal: 14,
  },
  sendButtonDisabled: { opacity: 0.35 },
  sendText: { color: colors.surface, fontSize: 14, fontWeight: '800' },
  reference: {
    backgroundColor: colors.background,
    borderRadius: 14,
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  referenceAuthor: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  referenceBody: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  input: {
    color: colors.ink,
    fontSize: 17,
    lineHeight: 25,
    minHeight: 130,
    paddingHorizontal: 2,
    paddingTop: 20,
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
