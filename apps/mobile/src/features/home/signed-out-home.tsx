import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';

import { HomeQuickActions } from './home-quick-actions';

export function SignedOutHome() {
  const colors = useTheme();
  const styles = createStyles(colors);

  return (
    <>
      <View style={styles.signedOutCard}>
        <View style={styles.signedOutMark}>
          <SymbolView
            name={{
              android: 'bookmark',
              ios: 'bookmark.fill',
              web: 'bookmark',
            }}
            size={24}
            tintColor={colors.accent}
          />
        </View>
        <Text style={styles.signedOutTitle}>从记录开始</Text>
        <Text style={styles.signedOutText}>
          登录 Bangumi 后同步在看的动画、在读的书籍和三次元进度。未登录时不会在本机创建另一份记录。
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/account')}
          style={({ pressed }) => [
            styles.loginButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.loginButtonText}>登录 Bangumi</Text>
        </Pressable>
      </View>
      <HomeQuickActions />
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  signedOutCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: SPACING.xl,
  },
  signedOutMark: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: 16,
    minHeight: 52,
    paddingVertical: SPACING.sm,
    justifyContent: 'center',
    width: 52,
  },
  signedOutTitle: {
    color: colors.ink,
    fontSize: TYPE.display.fontSize,
    fontWeight: '800',
    letterSpacing: TYPE.display.letterSpacing,
    marginTop: SPACING.xl,
  },
  signedOutText: {
    color: colors.muted,
    fontSize: TYPE.body.fontSize,
    lineHeight: TYPE.body.lineHeight,
    marginTop: SPACING.md,
  },
  loginButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: colors.accent,
    borderRadius: 16,
    minHeight: 52,
    paddingVertical: SPACING.sm,
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  loginButtonText: { color: colors.surface, fontSize: TYPE.body.fontSize, fontWeight: '800' },
  pressed: { opacity: 0.62 },
});
