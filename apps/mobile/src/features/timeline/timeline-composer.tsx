import { useEffect, useRef, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import { useCreateTimelineSay } from './use-create-timeline-say';

const MAX_CONTENT_LENGTH = 380;

export function TimelineComposer({
  onClose,
  visible,
}: {
  onClose: () => void;
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [content, setContent] = useState('');
  const createTimeline = useCreateTimelineSay();
  const canSend = content.trim().length > 0 && !createTimeline.isPending;

  useEffect(() => {
    if (!visible) {
      createTimeline.reset();
      return;
    }

    const timer = setTimeout(() => inputRef.current?.focus(), 220);
    return () => clearTimeout(timer);
  }, [visible]);

  function close() {
    if (createTimeline.isPending) {
      return;
    }

    Keyboard.dismiss();
    onClose();
  }

  function send() {
    const nextContent = content.trim();

    if (!nextContent || createTimeline.isPending) {
      return;
    }

    Keyboard.dismiss();
    createTimeline.mutate(nextContent, {
      onSuccess: () => {
        setContent('');
        onClose();
      },
    });
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={close}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable
          accessibilityLabel="关闭发布动态"
          accessibilityRole="button"
          onPress={close}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <View style={styles.handle} />
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
                tintColor={COLORS.muted}
                weight="semibold"
              />
            </Pressable>
            <Text style={styles.title}>发布动态</Text>
            <Pressable
              accessibilityRole="button"
              disabled={!canSend}
              onPress={send}
              style={({ pressed }) => [
                styles.sendButton,
                !canSend && styles.sendButtonDisabled,
                pressed && canSend && styles.pressed,
              ]}
            >
              {createTimeline.isPending ? (
                <ActivityIndicator color={COLORS.surface} size="small" />
              ) : (
                <Text style={styles.sendText}>发布</Text>
              )}
            </Pressable>
          </View>

          <TextInput
            accessibilityLabel="动态内容"
            maxLength={MAX_CONTENT_LENGTH}
            multiline
            onChangeText={setContent}
            placeholder="分享此刻…"
            placeholderTextColor={COLORS.subtle}
            ref={inputRef}
            scrollEnabled
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
                tintColor={COLORS.subtle}
              />
              <Text style={styles.hintText}>发布时完成一次 Bangumi 安全验证</Text>
            </View>
            <Text style={styles.count}>
              {content.length}/{MAX_CONTENT_LENGTH}
            </Text>
          </View>

          {createTimeline.error ? (
            <Text accessibilityRole="alert" style={styles.errorText}>
              {createTimeline.error.message}
            </Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: COLORS.track,
    borderRadius: 2,
    height: 4,
    marginBottom: 14,
    width: 36,
  },
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
  title: { color: COLORS.ink, fontSize: 17, fontWeight: '800' },
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
  input: {
    color: COLORS.ink,
    fontSize: 18,
    lineHeight: 27,
    minHeight: 150,
    paddingHorizontal: 2,
    paddingTop: 24,
  },
  footer: {
    alignItems: 'center',
    borderTopColor: COLORS.track,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 46,
  },
  verificationHint: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  hintText: { color: COLORS.muted, fontSize: 12 },
  count: { color: COLORS.muted, fontSize: 12, fontVariant: ['tabular-nums'] },
  errorText: {
    color: COLORS.accent,
    fontSize: 12,
    lineHeight: 18,
    paddingBottom: 8,
  },
  pressed: { opacity: 0.62 },
});
