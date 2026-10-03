import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { HIT_SLOP, MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import { useTheme } from '@/features/theme/theme-provider';
import type { HistoryLocalStatus } from './use-synced-history';

export type HistoryLocalFeedback = {
  localStatus: HistoryLocalStatus;
  localError: string | null;
  retryLocalHistory: () => Promise<boolean>;
  isClearing: boolean;
};

export function HistoryLocalNotice({ label, history }: { label: string; history: HistoryLocalFeedback }) {
  const colors = useTheme();
  const [retrying, setRetrying] = useState(false);
  const latestRetry = useRef(history.retryLocalHistory);
  latestRetry.current = history.retryLocalHistory;
  useEffect(() => { setRetrying(false); }, [history.retryLocalHistory]);
  if (history.localStatus === 'ready') return null;
  const loading = history.localStatus === 'loading';
  const action = history.localStatus === 'read-error' ? '重试读取' : '重试保存';
  return <View style={styles.notice}>
    <Text accessibilityRole={loading ? 'text' : 'alert'} style={[styles.copy, { color: colors.muted }]}>
      {label}：{loading ? '正在读取本机记录…' : history.localError}
    </Text>
    {loading ? <ActivityIndicator accessibilityLabel={`正在读取${label}`} color={colors.muted} /> : (
      <Pressable
        accessibilityLabel={`${action}${label}`}
        accessibilityRole="button"
        hitSlop={HIT_SLOP}
        accessibilityState={{ busy: retrying, disabled: retrying }}
        disabled={retrying}
        onPress={() => {
          const retry = history.retryLocalHistory;
          setRetrying(true);
          void retry().finally(() => { if (latestRetry.current === retry) setRetrying(false); });
        }}
        style={({ pressed }) => [styles.retry, { backgroundColor: colors.surfaceSoft }, pressed && styles.pressed]}
      ><Text style={[styles.action, { color: colors.accent }]}>{retrying ? '正在重试…' : action}</Text></Pressable>
    )}
  </View>;
}
const styles = StyleSheet.create({
  notice: { gap: SPACING.sm, paddingVertical: SPACING.sm },
  copy: { ...TYPE.caption },
  retry: { minHeight: MIN_TOUCH_SIZE, minWidth: MIN_TOUCH_SIZE, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: SPACING.md, borderRadius: 12 },
  action: { ...TYPE.caption, fontWeight: '600' },
  pressed: { opacity: 0.6 },
});
