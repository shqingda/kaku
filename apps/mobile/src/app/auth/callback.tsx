import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/design';
import { useAuth } from '@/features/auth/auth-provider';

export default function AuthCallbackScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { completeSignIn } = useAuth();
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
    <View style={styles.screen}>
      {error ? (
        <>
          <Text style={styles.title}>登录没有完成</Text>
          <Text style={styles.message}>{error}</Text>
        </>
      ) : (
        <>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.message}>正在完成登录</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    flex: 1,
    justifyContent: 'center',
    padding: 32,
  },
  title: { color: COLORS.ink, fontSize: 22, fontWeight: '800' },
  message: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
    textAlign: 'center',
  },
});
