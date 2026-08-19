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
import { AppSheet } from '@/features/shared/app-sheet';
import { confirmDiscard } from '@/features/shared/confirm-discard';
import { useTheme } from '@/features/theme/theme-provider';
import { useCreateTimelineSay } from './use-create-timeline-say';

const MAX_CONTENT_LENGTH = 380;

export function TimelineComposer({
  onClose,
  visible,
}: {
  onClose: () => void;
  visible: boolean;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [content, setContent] = useState('');
  const createTimeline = useCreateTimelineSay();
  const hasUnsavedChanges = Boolean(content.trim());
  const canSend = content.trim().length > 0 && !createTimeline.isPending;

  useEffect(() => {
    if (!visible) {
      createTimeline.reset();
    }
  }, [visible]);

  function focusInput() {
    requestIdleCallback(() => inputRef.current?.focus(), { timeout: 200 });
  }

  function finishClose() {
    Keyboard.dismiss();
    setContent('');
    onClose();
  }

  function close() {
    if (createTimeline.isPending) {
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

    if (!nextContent || createTimeline.isPending) {
      return;
    }

    createTimeline.mutate(nextContent, {
      onSuccess: () => {
        Keyboard.dismiss();
        setContent('');
        onClose();
      },
    });
  }

  return (
    <AppSheet
      onClose={close}
      onShow={focusInput}
      swipeToDismissEnabled={
        !hasUnsavedChanges && !createTimeline.isPending
      }
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
            disabled={createTimeline.isPending}
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
          <Text accessibilityRole="header" style={styles.title}>发布动态</Text>
          <Pressable
            accessibilityLabel="发布动态"
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
            {createTimeline.isPending ? (
              <ActivityIndicator color={colors.surface} size="small" />
            ) : (
              <Text style={styles.sendText}>发布</Text>
            )}
          </Pressable>
        </View>

        <TextInput
          accessibilityLabel="动态内容"
          accessibilityHint={`最多输入 ${MAX_CONTENT_LENGTH} 个字符`}
          autoFocus
          maxLength={MAX_CONTENT_LENGTH}
          multiline
          onChangeText={setContent}
          placeholder="分享此刻…"
          placeholderTextColor={colors.subtle}
          ref={inputRef}
          scrollEnabled
          showSoftInputOnFocus
          style={styles.input}
          textAlignVertical="top"
          value={content}
        />

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
  title: { color: colors.ink, fontSize: 17, fontWeight: '800' },
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
  input: {
    color: colors.ink,
    fontSize: 18,
    lineHeight: 27,
    minHeight: 150,
    paddingHorizontal: 2,
    paddingTop: 24,
  },
  footer: {
    alignItems: 'center',
    borderTopColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 46,
  },
  verificationHint: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  hintText: { color: colors.muted, fontSize: 12 },
  count: { color: colors.muted, fontSize: 12, fontVariant: ['tabular-nums'] },
  errorText: {
    color: colors.accent,
    fontSize: 12,
    lineHeight: 18,
    paddingBottom: 8,
  },
  pressed: { opacity: 0.62 },
});
