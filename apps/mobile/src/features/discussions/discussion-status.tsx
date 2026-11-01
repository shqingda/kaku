import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';

type DiscussionStatusProps = {
  errorText?: string;
  isError: boolean;
  isPending: boolean;
  loadingText?: string;
  onRetry: () => void;
  retryLabel?: string;
};

export function DiscussionStatus({
  errorText = '讨论加载失败，请检查网络后重试。',
  isError,
  isPending,
  loadingText = '正在读取 Bangumi 讨论…',
  onRetry,
  retryLabel = '重试加载讨论',
}: DiscussionStatusProps) {
  const colors = useTheme();
  const styles = createStyles(colors);

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
          accessibilityLabel={retryLabel}
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.pressed,
          ]}
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
    gap: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
  },
  errorBox: { backgroundColor: colors.accentSoft },
  text: { color: colors.muted, flex: 1, ...TYPE.caption },
  retryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_SIZE,
    minWidth: MIN_TOUCH_SIZE,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  retry: { color: colors.accent, ...TYPE.caption, fontWeight: '700' },
  pressed: { opacity: 0.62 },
});
