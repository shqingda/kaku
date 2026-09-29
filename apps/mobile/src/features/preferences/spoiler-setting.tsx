import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import { useTheme } from '@/features/theme/theme-provider';
import type { ThemeColors } from '@/constants/theme';
import { useSpoilerPreference } from './spoiler-preference';
export function SpoilerSetting() {
  const styles = createStyles(useTheme());
  const { enabled, error, toggle } = useSpoilerPreference();
  return <View style={styles.container}>
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: enabled }} accessibilityLabel="折叠未看章节讨论" onPress={toggle} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Text style={styles.title}>折叠未看章节讨论：{enabled ? '开启' : '关闭'}</Text>
    </Pressable>
    <Text style={styles.description}>开启后，未看或进度未知的章节讨论默认折叠，可单次展开。音乐不受影响，仅保存在本机。</Text>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
  </View>;
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { backgroundColor: colors.surface, padding: SPACING.lg, borderRadius: 20, marginTop: SPACING.xl },
  button: { minHeight: MIN_TOUCH_SIZE, justifyContent: 'center' },
  title: { ...TYPE.body, color: colors.ink, fontWeight: '600' },
  description: { ...TYPE.caption, color: colors.muted, marginTop: SPACING.sm },
  error: { ...TYPE.caption, color: colors.accent, marginTop: SPACING.sm },
  pressed: { opacity: 0.6 },
});
