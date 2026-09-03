// 退出登录与断开 Bangumi 的操作区（已登录状态显示）。
import { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { useTheme } from '@/features/theme/theme-provider';

export function AccountSignOutActions() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { disconnectBangumi, signOut } = useAuth();

  function confirmDisconnect() {
    Alert.alert(
      '断开 Bangumi？',
      '将退出所有 Kaku 设备并删除 Kaku 保存的 Bangumi 凭证。Bangumi 没有开放 OAuth 撤销接口，授权令牌会在 Bangumi 侧到期。',
      [
        { style: 'cancel', text: '取消' },
        {
          onPress: () => void disconnectBangumi(),
          style: 'destructive',
          text: '断开全部设备',
        },
      ],
    );
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => void signOut()}
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.secondaryButtonText}>退出登录</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={confirmDisconnect}
        style={({ pressed }) => [
          styles.disconnectButton,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.disconnectButtonText}>断开 Bangumi</Text>
      </Pressable>
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    marginTop: 14,
  },
  secondaryButtonText: { color: colors.accent, fontSize: 15, fontWeight: '700' },
  disconnectButton: { alignItems: 'center', marginTop: 16, paddingVertical: 10 },
  disconnectButtonText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  pressed: { opacity: 0.62 },
});
