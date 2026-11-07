// 未登录面板：连接 Bangumi 的介绍、错误提示与登录入口。
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { SPACING, TYPE } from '@/constants/design';
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
  intro: { alignItems: 'center', marginBottom: SPACING.xxl },
  logoMark: {
    borderRadius: 20,
    height: 76,
    marginBottom: SPACING.xl,
    width: 76,
  },
  title: {
    color: colors.ink,
    ...TYPE.display,
    fontWeight: '800',
  },
  description: {
    color: colors.muted,
    ...TYPE.body,
    lineHeight: 23,
    marginTop: SPACING.md,
    maxWidth: 320,
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: colors.accentSoft,
    borderRadius: 16,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
  },
  errorText: {
    color: colors.accent,
    ...TYPE.body,
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
    ...TYPE.heading,
    fontWeight: '800',
  },
  privacyText: {
    color: colors.subtle,
    ...TYPE.caption,
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
  aboutLink: { alignSelf: 'center', marginTop: SPACING.md, padding: SPACING.md },
  aboutLinkText: { color: colors.muted, ...TYPE.caption, fontWeight: '600' },
  pressed: { opacity: 0.62 },
});
