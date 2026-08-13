import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS, SPACING, TYPE } from '@/constants/design';

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

const styles = StyleSheet.create({
  state: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: SPACING.xxl - 2,
  },
  stateTitle: { color: COLORS.ink, ...TYPE.heading },
  stateText: {
    color: COLORS.muted,
    ...TYPE.caption,
    lineHeight: 20,
    marginTop: SPACING.sm - 1,
    textAlign: 'center',
  },
  retry: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 13,
    marginTop: SPACING.lg - 1,
    paddingHorizontal: 17,
    paddingVertical: 9,
  },
  retryText: { color: COLORS.accent, ...TYPE.caption, fontWeight: '800' },
  pressed: { opacity: 0.62 },
});
