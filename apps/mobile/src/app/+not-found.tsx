import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/design';

export default function NotFoundScreen() {
  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.content}>
        <View style={styles.iconFrame}>
          <SymbolView
            name={{
              android: 'explore_off',
              ios: 'signpost.right.and.left',
              web: 'explore_off',
            }}
            size={30}
            tintColor={COLORS.accent}
            weight="medium"
          />
        </View>
        <Text style={styles.title}>这个页面暂时找不到</Text>
        <Text style={styles.description}>
          链接可能已经失效，或当前版本还没有对应页面。你的账户和收藏数据不会受到影响。
        </Text>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={goBack}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>返回</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
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

const styles = StyleSheet.create({
  screen: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 34,
    paddingVertical: 48,
  },
  iconFrame: {
    alignItems: 'center',
    backgroundColor: COLORS.accentSoft,
    borderRadius: 24,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  title: {
    color: COLORS.ink,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: 24,
    textAlign: 'center',
  },
  description: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
    maxWidth: 330,
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
