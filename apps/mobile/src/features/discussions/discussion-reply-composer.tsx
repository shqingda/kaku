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

import { COLORS } from '@/constants/design';
import { AppSheet } from '@/features/shared/app-sheet';
import { playSuccessHaptic } from '@/lib/haptics';

import type { DiscussionReply } from './model';
import {
  type DiscussionReplyTarget,
  useCreateDiscussionReply,
} from './use-create-discussion-reply';
import { useEditGroupReply, useEditSubjectReply } from './use-edit-reply';

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
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [content, setContent] = useState('');
  const createReply = useCreateDiscussionReply(target);
  const editSubjectReply = useEditSubjectReply(
    target.kind === 'subject-topic' ? target.id : 0,
  );
  const editGroupReply = useEditGroupReply(
    target.kind === 'group-topic' ? target.id : 0,
  );
  const editReply =
    target.kind === 'subject-topic' ? editSubjectReply : editGroupReply;
  const isEditing = editing != null;
  const pending = createReply.isPending || editReply.isPending;
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

  function close() {
    if (pending) {
      return;
    }

    Keyboard.dismiss();
    onClose();
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
    <AppSheet onClose={close} visible={visible}>
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
                tintColor={COLORS.muted}
                weight="semibold"
              />
            </Pressable>
            <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
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
                <ActivityIndicator color={COLORS.surface} size="small" />
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
            placeholder="友善地参与讨论…"
            placeholderTextColor={COLORS.subtle}
            ref={inputRef}
            scrollEnabled
            showSoftInputOnFocus
            style={styles.input}
            textAlignVertical="top"
            value={content}
          />

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

const styles = StyleSheet.create({
  content: {},
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#F7F6F2',
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  title: {
    color: COLORS.ink,
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    marginHorizontal: 12,
    textAlign: 'center',
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    minWidth: 62,
    paddingHorizontal: 14,
  },
  sendButtonDisabled: { opacity: 0.35 },
  sendText: { color: COLORS.surface, fontSize: 14, fontWeight: '800' },
  reference: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  referenceAuthor: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },
  referenceBody: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  input: {
    color: COLORS.ink,
    fontSize: 17,
    lineHeight: 25,
    minHeight: 130,
    paddingHorizontal: 2,
    paddingTop: 20,
  },
  footer: {
    alignItems: 'center',
    borderTopColor: COLORS.track,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  hint: { color: COLORS.muted, fontSize: 11 },
  count: { color: COLORS.muted, fontSize: 11, fontVariant: ['tabular-nums'] },
  errorText: {
    color: COLORS.accent,
    fontSize: 12,
    lineHeight: 18,
    paddingBottom: 8,
  },
  pressed: { opacity: 0.62 },
});
