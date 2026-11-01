import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';

export function CachedDataNotice({ onRetry }: { onRetry: () => void }) {
  const colors = useTheme();
  const styles = createStyles(colors);

  return (
    <View accessibilityRole="alert" style={styles.notice}>
      <View style={styles.copy}>
        <Text style={styles.title}>当前显示上次保存的内容</Text>
        <Text style={styles.detail}>网络恢复后可重新读取最新数据。</Text>
      </View>
      <Pressable
        accessibilityLabel="重新获取最新内容"
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
      >
        <Text style={styles.retryText}>重试</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    notice: {
      alignItems: 'center',
      backgroundColor: colors.divider,
      borderCurve: 'continuous',
      borderRadius: 16,
      flexDirection: 'row',
      marginBottom: SPACING.lg,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
    },
    copy: { flex: 1 },
    title: { color: colors.ink, ...TYPE.caption, fontWeight: '700' },
    detail: { color: colors.muted, ...TYPE.micro, marginTop: SPACING.xs },
    retry: {
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 11,
      justifyContent: 'center',
      marginLeft: SPACING.md,
      minHeight: MIN_TOUCH_SIZE,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
    },
    retryText: { color: colors.accent, ...TYPE.caption, fontWeight: '700' },
    pressed: { opacity: 0.62 },
  });
