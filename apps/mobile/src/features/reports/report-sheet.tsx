import { userErrorMessage } from '@/lib/user-error-message';
import { useEffect, useMemo, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
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
import { playSuccessHaptic } from '@/lib/haptics';

import { useCreateReport } from './use-create-report';

export const REPORT_REASON_OPTIONS = [
  { label: '辱骂或人身攻击', value: 1 },
  { label: '垃圾信息', value: 2 },
  { label: '政治敏感内容', value: 3 },
  { label: '违法违规内容', value: 4 },
  { label: '泄露隐私', value: 5 },
  { label: '恶意刷分', value: 6 },
  { label: '引战或攻击性言论', value: 7 },
  { label: '广告', value: 8 },
  { label: '剧透', value: 9 },
  { label: '其他', value: 99 },
] as const;

const MAX_COMMENT_LENGTH = 2000;

export function ReportSheet({
  onClose,
  onSubmitted,
  target,
  visible,
}: {
  onClose: () => void;
  onSubmitted?: () => void;
  target: { id: number; label: string; type: number };
  visible: boolean;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState<number>();
  const [comment, setComment] = useState('');
  const createReport = useCreateReport();
  const hasUnsavedChanges = reason !== undefined || Boolean(comment.trim());
  const canSubmit =
    reason !== undefined && !createReport.isPending;

  useEffect(() => {
    if (!visible) {
      createReport.reset();
      setReason(undefined);
      setComment('');
    }
  }, [visible]);

  function close() {
    if (createReport.isPending) {
      return;
    }

    if (hasUnsavedChanges) {
      confirmDiscard(onClose);
      return;
    }

    onClose();
  }

  function submit() {
    if (reason === undefined || createReport.isPending) {
      return;
    }

    createReport.mutate(
      {
        comment: comment.trim() || undefined,
        id: target.id,
        reason,
        type: target.type,
      },
      {
        onSuccess: () => {
          playSuccessHaptic();
          onClose();
          onSubmitted?.();
        },
      },
    );
  }

  return (
    <AppSheet
      onClose={close}
      swipeToDismissEnabled={!hasUnsavedChanges && !createReport.isPending}
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
            hitSlop={8}
            disabled={createReport.isPending}
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
            举报{target.label}
          </Text>
          <View style={styles.closeButtonSpacer} />
        </View>

        <Text style={styles.intro}>请选择举报理由：</Text>
        <View accessibilityRole="radiogroup" style={styles.reasons}>
          {REPORT_REASON_OPTIONS.map((option) => {
            const isSelected = reason === option.value;

            return (
              <Pressable
                accessibilityLabel={option.label}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                key={option.value}
                onPress={() => setReason(option.value)}
                style={({ pressed }) => [
                  styles.reasonRow,
                  isSelected && styles.selectedReasonRow,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.reasonText,
                    isSelected && styles.selectedReasonText,
                  ]}
                >
                  {option.label}
                </Text>
                <View
                  style={[
                    styles.reasonIndicator,
                    isSelected && styles.selectedIndicator,
                  ]}
                >
                  {isSelected ? (
                    <SymbolView
                      name={{
                        android: 'check',
                        ios: 'checkmark',
                        web: 'check',
                      }}
                      size={12}
                      tintColor={colors.surface}
                      weight="bold"
                    />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          accessibilityLabel="举报说明"
          maxLength={MAX_COMMENT_LENGTH}
          multiline
          onChangeText={setComment}
          placeholder="补充说明（可选）"
          placeholderTextColor={colors.subtle}
          style={styles.comment}
          textAlignVertical="top"
          value={comment}
        />

        <Pressable
          accessibilityLabel="提交举报"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit }}
          disabled={!canSubmit}
          onPress={submit}
          style={({ pressed }) => [
            styles.submit,
            !canSubmit && styles.submitDisabled,
            pressed && canSubmit && styles.pressed,
          ]}
        >
          {createReport.isPending ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.submitText}>提交举报</Text>
          )}
        </Pressable>
        {createReport.error ? (
          <Text accessibilityRole="alert" style={styles.errorText}>
            {userErrorMessage(createReport.error)}
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
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  closeButtonSpacer: { height: 32, width: 32 },
  title: {
    color: colors.ink,
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    marginHorizontal: 12,
    textAlign: 'center',
  },
  intro: { color: colors.muted, fontSize: 13, marginTop: 14 },
  reasons: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    marginTop: 10,
    padding: 4,
  },
  reasonRow: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  selectedReasonRow: { backgroundColor: colors.surface },
  reasonText: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  selectedReasonText: { color: colors.accent, fontWeight: '800' },
  reasonIndicator: {
    alignItems: 'center',
    borderColor: colors.track,
    borderRadius: 9,
    borderWidth: 1,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  selectedIndicator: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  comment: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  submit: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 15,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 48,
  },
  submitDisabled: { opacity: 0.46 },
  submitText: { color: colors.surface, fontSize: 15, fontWeight: '800' },
  errorText: {
    color: colors.accent,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    textAlign: 'center',
  },
  pressed: { opacity: 0.62 },
});
