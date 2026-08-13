import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';

type DiscussionStatusProps = {
  errorText?: string;
  isError: boolean;
  isPending: boolean;
  loadingText?: string;
  onRetry: () => void;
};

export function DiscussionStatus({
  errorText = '讨论加载失败，请检查网络后重试。',
  isError,
  isPending,
  loadingText = '正在读取 Bangumi 讨论…',
  onRetry,
}: DiscussionStatusProps) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!isError && !isPending) {
    return null;
  }

  return (
    <View
      accessibilityLiveRegion={isError ? 'assertive' : 'polite'}
      accessibilityRole={isError ? 'alert' : undefined}
      style={[styles.box, isError && styles.errorBox]}
    >
      <Text style={styles.text}>
        {isError ? errorText : loadingText}
      </Text>
      {isError ? (
        <Pressable
          accessibilityLabel="重试加载讨论"
          accessibilityRole="button"
          onPress={onRetry}
          style={styles.retryButton}
        >
          <Text style={styles.retry}>重试</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  box: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    padding: 14,
  },
  errorBox: { backgroundColor: colors.accentSoft },
  text: { color: colors.muted, flex: 1, fontSize: 13 },
  retryButton: { alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 56 },
  retry: { color: colors.accent, fontSize: 13, fontWeight: '700', marginLeft: 12 },
});
