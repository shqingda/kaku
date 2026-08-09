import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/design';

export function DiscussionUnavailableState({
  isSigningIn,
  onSignIn,
  onRetry,
  signedIn,
}: {
  isSigningIn: boolean;
  onRetry: () => void;
  onSignIn: () => void;
  signedIn: boolean;
}) {
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>暂时无法查看这个话题</Text>
        <Text style={styles.message}>
          {signedIn
            ? '该话题可能已被删除、正在审核，或当前账号没有访问权限。'
            : '该话题可能只对登录用户开放。登录 Bangumi 后可以再次尝试。'}
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={isSigningIn}
          onPress={signedIn ? onRetry : onSignIn}
          style={({ pressed }) => [
            styles.button,
            (pressed || isSigningIn) && styles.pressed,
          ]}
        >
          <Text style={styles.buttonText}>
            {signedIn ? '重新读取' : isSigningIn ? '正在登录…' : '登录后查看'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 24 },
  card: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 26,
  },
  title: { color: COLORS.ink, fontSize: 20, fontWeight: '800' },
  message: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 9,
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 15,
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 48,
    paddingHorizontal: 24,
  },
  buttonText: { color: COLORS.surface, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.62 },
});
