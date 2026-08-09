import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';
import { useAuth } from '@/features/auth/auth-provider';

export default function AuthCallbackScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { completeSignIn, isSigningIn, signIn } = useAuth();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!code) {
      setError('登录回调缺少一次性交接码。');
      return;
    }

    void completeSignIn(`kaku://auth/callback?code=${encodeURIComponent(code)}`)
      .then(() => router.replace('/'))
      .catch((caughtError: unknown) => {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : '登录没有完成，请返回后重试。',
        );
      });
  }, [code, completeSignIn]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        {error ? (
          <>
            <View style={styles.errorMark}>
              <Text style={styles.errorMarkText}>!</Text>
            </View>
            <Text style={styles.title}>登录没有完成</Text>
            <Text style={styles.message}>{error}</Text>
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.replace('/')}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.secondaryButtonText}>回到首页</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={isSigningIn}
                onPress={() =>
                  void signIn().then((ok) => ok && router.replace('/'))
                }
                style={({ pressed }) => [
                  styles.primaryButton,
                  (pressed || isSigningIn) && styles.pressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {isSigningIn ? '正在登录…' : '重新登录'}
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.message}>正在完成登录</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 32,
  },
  errorMark: {
    alignItems: 'center',
    backgroundColor: COLORS.accentSoft,
    borderRadius: 22,
    height: 64,
    justifyContent: 'center',
    marginBottom: 22,
    width: 64,
  },
  errorMarkText: {
    color: COLORS.accent,
    fontSize: 28,
    fontWeight: '800',
  },
  title: { color: COLORS.ink, fontSize: 22, fontWeight: '800' },
  message: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 28,
    width: '100%',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.track,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    justifyContent: 'center',
    minHeight: 50,
  },
  secondaryButtonText: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.ink,
    borderRadius: 16,
    flex: 1,
    justifyContent: 'center',
    minHeight: 50,
  },
  primaryButtonText: {
    color: COLORS.surface,
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: { opacity: 0.62 },
});
