import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import { useTheme } from '@/features/theme/theme-provider';
import type { ThemeColors } from '@/constants/theme';

export function TopicReadingNotice({ available, error, onContinue, onStart, saved }: {
  available: boolean; error: string; onContinue: () => void; onStart: () => void; saved: boolean;
}) {
  const styles = createStyles(useTheme());
  if (!saved && !error) return null;
  return <View style={styles.container}>
    {error ? <Text accessibilityRole="alert" style={styles.copy}>{error}</Text> : null}
    {saved ? <>
      <Text style={styles.copy}>{available ? '上次读到的回复已保存在本机。' : '上次的回复未在当前内容中找到，可以从头阅读。'}</Text>
      <View style={styles.actions}>
        {available ? <Pressable accessibilityRole="button" onPress={onContinue} style={styles.button}><Text style={styles.label}>继续阅读</Text></Pressable> : null}
        <Pressable accessibilityRole="button" onPress={onStart} style={styles.button}><Text style={styles.label}>从头阅读</Text></Pressable>
      </View>
    </> : null}
  </View>;
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { padding: SPACING.lg, gap: SPACING.xs },
  copy: { ...TYPE.caption, color: colors.muted },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xl },
  button: { minHeight: MIN_TOUCH_SIZE, justifyContent: 'center' },
  label: { ...TYPE.body, color: colors.accent },
});
