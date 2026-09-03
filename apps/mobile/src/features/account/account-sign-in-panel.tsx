// 未登录面板：连接 Bangumi 的介绍、错误提示与登录入口。
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-provider';
import { takeReturnTo } from '@/lib/auth-redirect';
import { useTheme } from '@/features/theme/theme-provider';

export function AccountSignInPanel() {
  const colors = useTheme();
  const styles = createStyles(colors);
  const { error, isSigningIn, signIn } = useAuth();

  async function handleSignIn() {
    if (await signIn()) {
      const target = takeReturnTo();
      router.dismissTo((target ?? '/') as Href);
    }
  }

  return (
    <>
      <View style={styles.intro}>
        <Image
          accessibilityLabel="Kaku"
          contentFit="cover"
          source={require('../../../assets/images/kaku-icon.png')}
          style={styles.logoMark}
        />
        <Text style={styles.title}>连接 Bangumi</Text>
        <Text style={styles.description}>
          登录后同步收藏、观看进度和评分。Kaku 不会在手机里保存 Bangumi
          密钥。
        </Text>
      </View>
      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        disabled={isSigningIn}
        onPress={() => void handleSignIn()}
        style={({ pressed }) => [
          styles.primaryButton,
          (pressed || isSigningIn) && styles.pressed,
        ]}
      >
        {isSigningIn ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <Text style={styles.primaryButtonText}>使用 Bangumi 登录</Text>
        )}
      </Pressable>
      <Text style={styles.privacyText}>
        授权在系统浏览器中完成，密码不会经过 Kaku。
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/about')}
        style={({ pressed }) => [
          styles.aboutLink,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.aboutLinkText}>关于、帮助与隐私</Text>
      </Pressable>
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  intro: { alignItems: 'center', marginBottom: 32 },
  logoMark: {
    borderRadius: 20,
    height: 76,
    marginBottom: 22,
    width: 76,
  },
  title: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  description: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 12,
    maxWidth: 320,
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: colors.accentSoft,
    borderRadius: 16,
    marginBottom: 14,
    padding: 14,
  },
  errorText: {
    color: colors.accent,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 16,
    height: 54,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '800',
  },
  privacyText: {
    color: colors.subtle,
    fontSize: 12,
    marginTop: 14,
    textAlign: 'center',
  },
  aboutLink: { alignSelf: 'center', marginTop: 10, padding: 10 },
  aboutLinkText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  pressed: { opacity: 0.62 },
});
