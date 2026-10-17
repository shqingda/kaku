import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import { useTheme } from '@/features/theme/theme-provider';

// Mount only while a submission is pending, so every attempt starts a fresh timer.
export function PublishProgress({ cancel, saving = false }: { cancel?: () => void; saving?: boolean }) {
  const colors = useTheme();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 8_000);
    return () => clearTimeout(timer);
  }, []);
  return <View style={styles.row}>
    <Text accessibilityLiveRegion="polite" style={[styles.text, { color: colors.muted }]}>
      {saving ? (slow ? '还在保存，请稍候' : '正在保存…') : (slow ? '还在发布，请稍候' : '正在发布…')}
    </Text>
    {cancel ? <Pressable accessibilityRole="button" onPress={cancel} style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
      <Text style={[styles.text, { color: colors.muted }]}>取消发布</Text>
    </Pressable> : null}
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm, minHeight: MIN_TOUCH_SIZE },
  text: { ...TYPE.caption, flexShrink: 1 },
  cancel: { minHeight: MIN_TOUCH_SIZE, justifyContent: 'center', paddingHorizontal: SPACING.sm },
  pressed: { opacity: 0.62 },
});
