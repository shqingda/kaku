import { useMemo } from 'react';
import { router, Stack } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const styles = useMemo(() => createStyles(colors), [colors]);

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
          {router.canGoBack() ? (
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
      padding: 32,
    },
    mark: {
      alignItems: 'center',
      backgroundColor: colors.accentSoft,
      borderRadius: 22,
      height: 72,
      justifyContent: 'center',
      width: 72,
    },
    markText: { color: colors.accent, fontSize: 30, fontWeight: '800' },
    title: {
      color: colors.ink,
      fontSize: 25,
      fontWeight: '800',
      letterSpacing: -0.5,
      marginTop: 24,
    },
    message: {
      color: colors.muted,
      fontSize: 15,
      lineHeight: 23,
      marginTop: 10,
      maxWidth: 310,
      textAlign: 'center',
    },
    actions: { flexDirection: 'row', gap: 10, marginTop: 28 },
    primaryButton: {
      alignItems: 'center',
      backgroundColor: colors.ink,
      borderRadius: 16,
      justifyContent: 'center',
      minHeight: 48,
      paddingHorizontal: 22,
    },
    primaryButtonText: { color: colors.surface, fontSize: 14, fontWeight: '800' },
    secondaryButton: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      justifyContent: 'center',
      minHeight: 48,
      paddingHorizontal: 22,
    },
    secondaryButtonText: { color: colors.ink, fontSize: 14, fontWeight: '800' },
    pressed: { opacity: 0.62, transform: [{ scale: 0.98 }] },
  });
