import { Stack } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';

// 章节页在资料到达前的整页状态：读取中、读取失败（可重试）和章节不存在。
export function EpisodeScreenState({
  onRetry,
  retryLabel,
  screenTitle,
  text,
  title,
}: {
  onRetry?: () => void;
  retryLabel?: string;
  screenTitle: string;
  text: string;
  title: string;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ title: screenTitle }} />
      <View style={styles.state}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>{text}</Text>
        {onRetry ? (
          <Pressable
            accessibilityLabel={retryLabel}
            accessibilityRole="button"
            onPress={onRetry}
            style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
          >
            <Text style={styles.retryText}>重试</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  state: { flex: 1, justifyContent: 'center', padding: SPACING.xxl },
  title: { color: colors.ink, ...TYPE.titleLarge, fontWeight: '700' },
  text: { color: colors.muted, ...TYPE.body, marginTop: SPACING.sm },
  retry: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: 13,
    justifyContent: 'center',
    marginTop: SPACING.lg,
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: SPACING.lg + SPACING.xs,
  },
  retryText: { color: colors.surface, ...TYPE.body, fontWeight: '800' },
  pressed: { opacity: 0.62 },
});
