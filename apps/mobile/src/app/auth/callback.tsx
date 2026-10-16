import { useEffect, useState } from 'react';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { takeReturnTo } from '@/lib/auth-redirect';
import { useTheme } from '@/features/theme/theme-provider';

export default function AuthCallbackScreen() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const { code, request_id: requestId } = useLocalSearchParams<{ code?: string; request_id?: string }>();
  const { completeSignIn, isSigningIn, signIn } = useAuth();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!code || !requestId) {
      setError('登录回调缺少必要信息，请重新发起登录。');
      return;
    }

    void completeSignIn(`kaku://auth/callback?code=${encodeURIComponent(code)}&request_id=${encodeURIComponent(requestId)}`)
      .then(() => {
        const target = takeReturnTo();
        router.dismissTo((target ?? '/') as Href);
      })
      .catch((caughtError: unknown) => {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : '登录没有完成，请返回后重试。',
        );
      });
  }, [code, completeSignIn, requestId]);

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
    padding: SPACING.xxl,
  },
  errorMark: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: SPACING.xl,
    height: SPACING.xxl * 2,
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    width: SPACING.xxl * 2,
  },
  errorMarkText: {
    color: colors.accent,
    ...TYPE.display,
    fontWeight: '800',
  },
  title: { color: colors.ink, ...TYPE.titleLarge, fontWeight: '800' },
  message: {
    color: colors.muted,
    ...TYPE.body,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xxl,
    width: '100%',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.track,
    borderRadius: SPACING.lg,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    justifyContent: 'center',
    minHeight: MIN_TOUCH_SIZE + SPACING.sm,
  },
  secondaryButtonText: {
    color: colors.ink,
    ...TYPE.body,
    fontWeight: '700',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: SPACING.lg,
    flex: 1,
    justifyContent: 'center',
    minHeight: MIN_TOUCH_SIZE + SPACING.sm,
  },
  primaryButtonText: {
    color: colors.surface,
    ...TYPE.body,
    fontWeight: '700',
  },
  pressed: { opacity: 0.62 },
});
