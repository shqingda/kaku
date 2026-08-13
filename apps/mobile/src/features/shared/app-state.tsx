import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';

// 统一的空/错误状态：加载失败、空列表、无网络等都通过它呈现。
// 失败永不隐藏在空白背后：标题 + 说明 + 显式重试按钮。
export function AppState({
  action,
  text,
  title,
}: {
  action?: () => void;
  text: string;
  title: string;
}) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View
      accessibilityLiveRegion={action ? 'assertive' : 'polite'}
      accessibilityRole={action ? 'alert' : undefined}
      style={styles.state}
    >
      <Text accessibilityRole="header" style={styles.stateTitle}>
        {title}
      </Text>
      <Text style={styles.stateText}>{text}</Text>
      {action ? (
        <Pressable
          accessibilityLabel={`重试${title}`}
          accessibilityRole="button"
          onPress={action}
          style={({ pressed }) => [
            styles.retry,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.retryText}>重试</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    state: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: SPACING.xxl - 2,
    },
    stateTitle: { color: colors.ink, ...TYPE.heading },
    stateText: {
      color: colors.muted,
      ...TYPE.caption,
      lineHeight: 20,
      marginTop: SPACING.sm - 1,
      textAlign: 'center',
    },
    retry: {
      backgroundColor: colors.accentSoft,
      borderRadius: 13,
      marginTop: SPACING.lg - 1,
      paddingHorizontal: 17,
      paddingVertical: 9,
    },
    retryText: { color: colors.accent, ...TYPE.caption, fontWeight: '800' },
    pressed: { opacity: 0.62 },
  });
