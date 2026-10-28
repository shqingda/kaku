// 本机退出登录，放在账户页末尾。
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { useTheme } from '@/features/theme/theme-provider';

export function AccountSignOutActions() {
  const styles = createStyles(useTheme());
  const { signOut } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const busy = useRef(false);

  async function run() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(undefined);
    try { await signOut(); }
    catch { setError('操作未完成，请重试。'); }
    finally { busy.current = false; setPending(false); }
  }

  return (
    <View style={styles.section}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: pending, busy: pending }}
        disabled={pending}
        onPress={() => void run()}
        style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
      >
        <Text style={styles.secondaryButtonText}>退出登录</Text>
      </Pressable>
      <Text style={styles.description}>其他设备保持登录。</Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: { marginTop: SPACING.xl, gap: SPACING.sm },
  secondaryButton: {
    alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16,
    minHeight: MIN_TOUCH_SIZE, paddingVertical: SPACING.md, justifyContent: 'center',
  },
  secondaryButtonText: { color: colors.accent, ...TYPE.body, fontWeight: '700' },
  description: { color: colors.subtle, ...TYPE.caption, textAlign: 'center' },
  error: { color: colors.accent, ...TYPE.caption, textAlign: 'center' },
  pressed: { opacity: 0.62 },
});
