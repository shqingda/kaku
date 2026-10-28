// 明确区分本机退出和所有设备解除连接，放在账户页末尾。
import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { useTheme } from '@/features/theme/theme-provider';

export function AccountSignOutActions() {
  const styles = createStyles(useTheme());
  const { disconnectBangumi, signOut } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const busy = useRef(false);

  async function run(action: () => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(undefined);
    try { await action(); }
    catch { setError('操作未完成，请重试。'); }
    finally { busy.current = false; setPending(false); }
  }

  function confirmDisconnect() {
    Alert.alert(
      '退出所有设备并解除连接？',
      '包括当前设备在内，所有设备都需要重新登录。Kaku 会删除保存的 Bangumi 登录凭证，不会删除你的 Bangumi 账号或收藏。',
      [
        { style: 'cancel', text: '取消' },
        { onPress: () => void run(disconnectBangumi), style: 'destructive', text: '退出全部并解除连接' },
      ],
    );
  }

  return (
    <View style={styles.section}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: pending, busy: pending }}
        disabled={pending}
        onPress={() => void run(signOut)}
        style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
      >
        <Text style={styles.secondaryButtonText}>退出当前设备</Text>
      </Pressable>
      <Text style={styles.description}>其他设备保持登录。</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: pending, busy: pending }}
        disabled={pending}
        onPress={confirmDisconnect}
        style={({ pressed }) => [styles.disconnectButton, pressed && styles.pressed]}
      >
        <Text style={styles.disconnectButtonText}>退出所有设备并解除连接</Text>
      </Pressable>
      <Text style={styles.description}>所有设备退出，并移除 Kaku 保存的 Bangumi 登录凭证。</Text>
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
  disconnectButton: { alignItems: 'center', minHeight: MIN_TOUCH_SIZE, marginTop: SPACING.sm, paddingVertical: SPACING.md, justifyContent: 'center' },
  disconnectButtonText: { color: colors.muted, ...TYPE.caption, fontWeight: '600' },
  description: { color: colors.subtle, ...TYPE.caption, textAlign: 'center' },
  error: { color: colors.accent, ...TYPE.caption, textAlign: 'center' },
  pressed: { opacity: 0.62 },
});
