import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';

export function CachedDataNotice({ onRetry }: { onRetry: () => void }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
      marginBottom: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    copy: { flex: 1 },
    title: { color: colors.ink, fontSize: 13, fontWeight: '700' },
    detail: { color: colors.muted, fontSize: 11, marginTop: 3 },
    retry: {
      backgroundColor: colors.surface,
      borderCurve: 'continuous',
      borderRadius: 11,
      justifyContent: 'center',
      marginLeft: 12,
      minHeight: 44,
      paddingHorizontal: 12,
    },
    retryText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
    pressed: { opacity: 0.62 },
  });
