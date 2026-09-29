import { userErrorMessage } from '@/lib/user-error-message';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SPACING, TYPE, HIT_SLOP, MIN_TOUCH_SIZE } from '@/constants/design';
import { useAuth } from '@/features/auth/auth-provider';
import { useReplyDraft } from '@/features/discussions/use-reply-draft';
import type { ThemeColors } from '@/constants/theme';
import { BangumiRichTextToolbar } from '@/features/emoji-picker/bangumi-emoji-picker';
import { useBangumiEmojiInsertion } from '@/features/emoji-picker/use-bangumi-emoji-insertion';
import { AppSheet } from '@/features/shared/app-sheet';
import { confirmDiscard } from '@/features/shared/confirm-discard';
import { useTheme } from '@/features/theme/theme-provider';
import { useCreateTimelineSay } from './use-create-timeline-say';

const MAX_CONTENT_LENGTH = 380;

export function TimelineComposer(props: Omit<ComponentProps<typeof TimelineComposerContent>, 'draftKey'>) {
  const { session } = useAuth();
  const [opening, setOpening] = useState({ visible: props.visible, generation: 0 });
  if (opening.visible !== props.visible) {
    setOpening({ visible: props.visible, generation: opening.generation + (props.visible ? 1 : 0) });
  }
  if (!session) return null;
  const draftKey = `kaku:timeline-draft:v1:${session.user.id}`;
  return <TimelineComposerContent {...props} key={`${draftKey}:${opening.generation}`} draftKey={draftKey} />;
}

function TimelineComposerContent({
  draftKey,
  onClose,
  visible,
}: {
  draftKey: string;
  onClose: () => void;
  visible: boolean;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const draft = useReplyDraft(draftKey, '', visible, '动态已发布');
  const { content, change: setContent } = draft;
  const sent = draft.phase === 'sent';
  const mounted = useRef(true);
  const submitting = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const { insertText, onSelectionChange } = useBangumiEmojiInsertion(
    inputRef,
    content,
    setContent,
    MAX_CONTENT_LENGTH,
  );
  const createTimeline = useCreateTimelineSay();
  const canSend = content.trim().length > 0 && !createTimeline.isPending && draft.loaded && !sent;

  function focusInput() {
    requestIdleCallback(() => inputRef.current?.focus(), { timeout: 200 });
  }

  function finishClose() {
    Keyboard.dismiss();
    onClose();
  }

  function close() {
    if (createTimeline.isPending) {
      return;
    }

    if (draft.dismiss()) finishClose();
  }

  function send() {
    if (!canSend || submitting.current) return;
    submitting.current = true;
    void createTimeline.mutateAsync(content.trim()).then(() => {
      const cleared = draft.complete();
      if (!mounted.current) return;
      if (cleared) finishClose();
    }).catch(() => {
      // Display the mutation error and retain the draft.
    }).finally(() => { submitting.current = false; });
  }

  return (
    <AppSheet
      header={
        <View style={styles.heading}>
          <Pressable
            accessibilityLabel="关闭"
            accessibilityRole="button"
            disabled={createTimeline.isPending}
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
          <Text accessibilityRole="header" style={styles.title}>发布动态</Text>
          <Pressable
            accessibilityLabel="发布动态"
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSend }}
            disabled={!canSend}
            hitSlop={HIT_SLOP}
            onPress={send}
            style={({ pressed }) => [
              styles.sendButton,
              !canSend && styles.sendButtonDisabled,
              pressed && canSend && styles.pressed,
            ]}
          >
            {createTimeline.isPending ? (
              <ActivityIndicator color={colors.surface} size="small" />
            ) : (
              <Text style={styles.sendText}>发布</Text>
            )}
          </Pressable>
        </View>
      }
      onClose={close}
      onShow={focusInput}
      swipeToDismissEnabled={
        !draft.error && !createTimeline.isPending
      }
      visible={visible}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        style={styles.body}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, SPACING.lg) },
        ]}
      >
        <TextInput
          accessibilityLabel="动态内容"
          accessibilityHint={`最多输入 ${MAX_CONTENT_LENGTH} 个字符`}
          autoFocus
          editable={draft.loaded && !sent && !createTimeline.isPending}
          maxLength={MAX_CONTENT_LENGTH}
          multiline
          onChangeText={setContent}
          onSelectionChange={onSelectionChange}
          placeholder="分享此刻…"
          placeholderTextColor={colors.subtle}
          ref={inputRef}
          scrollEnabled
          showSoftInputOnFocus
          style={styles.input}
          textAlignVertical="top"
          value={content}
        />

        {draft.loaded && !sent && !createTimeline.isPending ? <BangumiRichTextToolbar onInsert={insertText} /> : null}
        {content && !sent && !createTimeline.isPending ? (
          <Pressable accessibilityRole="button" style={styles.draftAction} onPress={() => confirmDiscard(() => { if (draft.clear()) finishClose(); })}>
            <Text style={styles.hintText}>丢弃草稿</Text>
          </Pressable>
        ) : null}
        {content && !sent && !draft.error ? <Text style={styles.hintText}>草稿已保存在本机</Text> : null}
        {draft.error ? (
          <Pressable accessibilityRole="button" style={styles.draftAction} onPress={() => { if (draft.retry() && sent) finishClose(); }}>
            <Text accessibilityRole="alert" style={styles.errorText}>{draft.error} · 重试</Text>
          </Pressable>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.verificationHint}>
            <SymbolView
              name={{
                android: 'verified_user',
                ios: 'checkmark.shield',
                web: 'verified_user',
              }}
              size={13}
              tintColor={colors.subtle}
            />
            <Text style={styles.hintText}>发布时完成一次 Bangumi 安全验证</Text>
          </View>
          <Text style={styles.count}>
            {content.length}/{MAX_CONTENT_LENGTH}
          </Text>
        </View>

        {createTimeline.error ? (
          <Text accessibilityRole="alert" style={styles.errorText}>
            {userErrorMessage(createTimeline.error)}
          </Text>
        ) : null}
      </ScrollView>
    </AppSheet>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  body: { flexShrink: 1 },
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
  title: { flex: 1, textAlign: 'center', marginHorizontal: SPACING.sm, color: colors.ink, ...TYPE.heading, fontWeight: '800' },
  sendButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 17,
    minHeight: MIN_TOUCH_SIZE,
    justifyContent: 'center',
    minWidth: 62,
    paddingHorizontal: SPACING.lg,
  },
  sendButtonDisabled: { opacity: 0.35 },
  sendText: { color: colors.surface, ...TYPE.body, fontWeight: '800' },
  input: {
    color: colors.ink,
    ...TYPE.heading,
    lineHeight: TYPE.heading.lineHeight,
    minHeight: 150,
    paddingHorizontal: SPACING.xs,
    paddingTop: SPACING.xl,
  },
  footer: {
    alignItems: 'center',
    borderTopColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: MIN_TOUCH_SIZE,
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  verificationHint: { flexShrink: 1, alignItems: 'center', flexDirection: 'row', gap: SPACING.sm },
  hintText: { flexShrink: 1, color: colors.muted, ...TYPE.caption },
  count: { color: colors.muted, ...TYPE.caption, fontVariant: ['tabular-nums'] },
  errorText: {
    color: colors.accent,
    ...TYPE.caption,
    lineHeight: TYPE.caption.lineHeight,
    paddingBottom: SPACING.sm,
  },
  pressed: { opacity: 0.62 },
});
