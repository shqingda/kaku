import { router, Stack, useNavigation } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';

export function InvalidRouteState({
  message = '这个链接不完整或已经失效。',
  title = '无法打开页面',
}: {
  message?: string;
  title?: string;
}) {
  const colors = useTheme();
  const styles = createStyles(colors);
  // 渲染期间只能问导航上下文；命令式 router 在首帧完成前（含 Web 静态渲染）会抛错。
  const navigation = useNavigation();

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <Stack.Screen options={{ headerShown: true, title }} />
      <View style={styles.content}>
        <View style={styles.mark}>
          <Text style={styles.markText}>?</Text>
        </View>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.actions}>
          {navigation.canGoBack() ? (
            <Pressable
              accessibilityRole="button"
              accessibilityHint="返回上一个页面"
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>返回</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityHint="返回 Kaku 首页"
            onPress={() => router.replace('/')}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>回到首页</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { backgroundColor: colors.background, flex: 1 },
    content: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      padding: SPACING.xxl,
    },
    mark: {
      alignItems: 'center',
      backgroundColor: colors.accentSoft,
      borderRadius: 22,
      height: 72,
      justifyContent: 'center',
      width: 72,
    },
    markText: { ...TYPE.display, color: colors.accent, fontWeight: '800' },
    title: {
      ...TYPE.titleLarge,
      color: colors.ink,
      fontWeight: '800',
      marginTop: SPACING.xl,
    },
    message: {
      ...TYPE.body,
      color: colors.muted,
      marginTop: SPACING.md,
      maxWidth: 310,
      textAlign: 'center',
    },
    actions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xl },
    primaryButton: {
      alignItems: 'center',
      backgroundColor: colors.ink,
      borderRadius: 16,
      justifyContent: 'center',
      minHeight: 48,
      paddingHorizontal: SPACING.xl,
    },
    primaryButtonText: { ...TYPE.body, color: colors.surface, fontWeight: '800' },
    secondaryButton: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      justifyContent: 'center',
      minHeight: 48,
      paddingHorizontal: SPACING.xl,
    },
    secondaryButtonText: { ...TYPE.body, color: colors.ink, fontWeight: '800' },
    pressed: { opacity: 0.62, transform: [{ scale: 0.98 }] },
  });
