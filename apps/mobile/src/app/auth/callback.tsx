import { useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { useTheme } from '@/features/theme/theme-provider';

export default function AuthCallbackScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.message}>正在完成登录</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
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
    backgroundColor: colors.accentSoft,
    borderRadius: 22,
    height: 64,
    justifyContent: 'center',
    marginBottom: 22,
    width: 64,
  },
  errorMarkText: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: '800',
  },
  title: { color: colors.ink, fontSize: 22, fontWeight: '800' },
  message: {
    color: colors.muted,
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
    backgroundColor: colors.surface,
    borderColor: colors.track,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    justifyContent: 'center',
    minHeight: 50,
  },
  secondaryButtonText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: 16,
    flex: 1,
    justifyContent: 'center',
    minHeight: 50,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: { opacity: 0.62 },
});
