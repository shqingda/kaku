import type { RefObject } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { COLORS } from '@/constants/design';

type DiscussionComposerProps = {
  disabledReason?: string;
  draft: string;
  inputRef: RefObject<TextInput | null>;
  onCancelReply: () => void;
  onChangeDraft: (value: string) => void;
  onSend: () => void;
  replyToAuthor?: string;
};

export function DiscussionComposer({
  disabledReason,
  draft,
  inputRef,
  onCancelReply,
  onChangeDraft,
  onSend,
  replyToAuthor,
}: DiscussionComposerProps) {
  const canSend = !disabledReason && draft.trim().length > 0;

  return (
    <View style={styles.composer}>
      {replyToAuthor ? (
        <View style={styles.replyTarget}>
          <Text numberOfLines={1} style={styles.replyTargetText}>
            回复 @{replyToAuthor}
          </Text>
          <Pressable
            accessibilityLabel="取消回复"
            accessibilityRole="button"
            hitSlop={10}
            onPress={onCancelReply}
          >
            <Text style={styles.cancelText}>取消</Text>
          </Pressable>
        </View>
      ) : null}
      {disabledReason ? (
        <Text style={styles.disabledReason}>{disabledReason}</Text>
      ) : null}
      <View style={styles.inputRow}>
        <TextInput
          accessibilityLabel="回复内容"
          editable={!disabledReason}
          multiline
          onChangeText={onChangeDraft}
          placeholder={
            disabledReason
              ? '登录 Bangumi 后可回复'
              : replyToAuthor
                ? `回复 @${replyToAuthor}…`
                : '说点什么…'
          }
          placeholderTextColor={COLORS.subtle}
          ref={inputRef}
          showSoftInputOnFocus
          style={styles.input}
          value={draft}
        />
        <Pressable
          accessibilityLabel="发送回复"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          onPress={onSend}
          style={({ pressed }) => [
            styles.sendButton,
            !canSend && styles.disabledSendButton,
            pressed && styles.pressedSendButton,
          ]}
        >
          <Text style={styles.sendButtonText}>回复</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  composer: {
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.track,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  replyTarget: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  replyTargetText: { color: COLORS.muted, flex: 1, fontSize: 12 },
  cancelText: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },
  disabledReason: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  inputRow: { alignItems: 'flex-end', flexDirection: 'row', gap: 10 },
  input: {
    backgroundColor: '#EFEEE9',
    borderRadius: 18,
    color: COLORS.ink,
    flex: 1,
    fontSize: 15,
    maxHeight: 110,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  disabledSendButton: { opacity: 0.35 },
  pressedSendButton: { opacity: 0.72, transform: [{ scale: 0.96 }] },
  sendButtonText: { color: COLORS.surface, fontSize: 14, fontWeight: '700' },
});
