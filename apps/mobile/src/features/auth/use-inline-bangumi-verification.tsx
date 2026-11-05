import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { WebView } from 'react-native-webview';

import { MIN_TOUCH_SIZE, SPACING, TYPE } from '@/constants/design';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/features/theme/theme-provider';
import {
  allowTurnstileNavigation,
  TURNSTILE_BRIDGE,
  TURNSTILE_PAGE_URL,
  TURNSTILE_WIDGET_HEIGHT,
  turnstileTokenFromRedirect,
} from './inline-turnstile-bridge';

export class InlineVerificationError extends Error {}

type Pending = { id: number; resolve: (token: string) => void; reject: (error: Error) => void };

// After 发布 a card slides in under the text with only Cloudflare's check.
// The user stays in control: there is no silent timeout, Cloudflare passes
// most people automatically, and 取消发布 (from the publish row) ends it.
export function useInlineBangumiVerification(active: boolean) {
  const pending = useRef<Pending | null>(null);
  const nextId = useRef(0);
  const [attempt, setAttempt] = useState<number | null>(null);
  const finish = useCallback((id: number, result: string | Error) => {
    const current = pending.current;
    if (!current || current.id !== id) return;
    pending.current = null;
    setAttempt(null);
    if (result instanceof Error) current.reject(result);
    else current.resolve(result);
  }, []);

  useEffect(() => {
    if (!active && pending.current) finish(pending.current.id, new InlineVerificationError('验证已结束，内容没有发送。'));
  }, [active, finish]);

  useEffect(() => () => {
    const current = pending.current;
    pending.current = null;
    current?.reject(new InlineVerificationError('验证已结束，内容没有发送。'));
  }, []);

  const requestToken = useCallback(() => new Promise<string>((resolve, reject) => {
    if (!active) { reject(new InlineVerificationError('编辑器已关闭，内容没有发送。')); return; }
    if (pending.current) { reject(new InlineVerificationError('安全验证正在进行，请稍候。')); return; }
    const id = ++nextId.current;
    pending.current = { id, resolve, reject };
    setAttempt(id);
  }), [active]);

  return {
    requestToken,
    cancel: attempt === null ? undefined : () => finish(attempt, new InlineVerificationError('已取消发布，内容没有发送。')),
    verification: attempt === null ? null : <VerificationCard key={attempt} onToken={token => finish(attempt, token)} />,
  };
}

function VerificationCard({ onToken }: { onToken: (token: string) => void }) {
  const colors = useTheme();
  const styles = createStyles(colors);
  // Bumping the key reloads the official page for a fresh challenge.
  const [load, setLoad] = useState(0);
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  useEffect(() => { Keyboard.dismiss(); }, []);

  const retry = () => { setFailure(null); setReady(false); setLoad(n => n + 1); };
  const fail = (message: string) => setFailure(current => current ?? message);

  return <Animated.View
    accessibilityLabel="安全验证"
    entering={FadeInDown.springify().damping(18).stiffness(220)}
    exiting={FadeOut.duration(160)}
    layout={LinearTransition.springify().damping(20).stiffness(220)}
    style={styles.card}
  >
    <View style={styles.titleRow}>
      <SymbolView
        name={{ android: 'verified_user', ios: 'checkmark.shield', web: 'verified_user' }}
        size={16}
        tintColor={colors.accent}
        weight="semibold"
      />
      <Text accessibilityRole="header" style={styles.title}>安全验证</Text>
    </View>
    <Text accessibilityLiveRegion="polite" style={[styles.caption, failure && styles.failure]}>
      {failure ?? 'Bangumi 需要确认是你本人，通过后会自动发布。'}
    </Text>
    {failure ? (
      <Pressable
        accessibilityRole="button"
        onPress={retry}
        style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
      >
        <Text style={styles.retryText}>重新验证</Text>
      </Pressable>
    ) : (
      <View style={styles.widget}>
        {ready ? null : (
          <Animated.View exiting={FadeOut.duration(120)} style={styles.loading}>
            <ActivityIndicator color={colors.muted} size="small" />
          </Animated.View>
        )}
        {/* Hidden until styled, so an unstyled page never flashes. */}
        <View style={[StyleSheet.absoluteFill, { opacity: ready ? 1 : 0 }]}>
          <WebView
            key={load}
            source={{ uri: TURNSTILE_PAGE_URL }}
            injectedJavaScript={TURNSTILE_BRIDGE}
            injectedJavaScriptBeforeContentLoaded={TURNSTILE_BRIDGE}
            javaScriptEnabled
            domStorageEnabled
            // Gate every navigation ourselves; otherwise WebView opens rejected
            // schemes in the system browser before calling our navigation handler.
            originWhitelist={['*']}
            onShouldStartLoadWithRequest={request => {
              const token = turnstileTokenFromRedirect(request.url);
              if (token) { onToken(token); return false; }
              return allowTurnstileNavigation(request.url, request.isTopFrame !== false);
            }}
            onOpenWindow={() => { /* Never open links outside the verification view. */ }}
            onLoadEnd={() => setReady(true)}
            onError={() => fail('无法连接安全验证服务，请检查网络后重新验证。')}
            onHttpError={({ nativeEvent }) => {
              // Cloudflare subresources can return 401 during normal PAT negotiation.
              if (allowTurnstileNavigation(nativeEvent.url, true)) fail('安全验证服务暂时不可用，请稍后重新验证。');
            }}
            onContentProcessDidTerminate={() => fail('安全验证已中断，请重新验证。')}
            onRenderProcessGone={() => fail('安全验证已中断，请重新验证。')}
            // Android otherwise lays the page out at desktop width and shrinks it.
            scalesPageToFit={false}
            setBuiltInZoomControls={false}
            scrollEnabled={false}
            nestedScrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
            style={styles.webview}
          />
        </View>
      </View>
    )}
  </Animated.View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.divider,
    borderCurve: 'continuous',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    gap: SPACING.xs,
    marginTop: SPACING.md,
    padding: SPACING.lg,
  },
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: SPACING.xs },
  title: { ...TYPE.body, color: colors.ink, fontWeight: '700' },
  caption: { ...TYPE.caption, color: colors.muted },
  failure: { color: colors.accentRich },
  widget: {
    alignItems: 'center',
    height: TURNSTILE_WIDGET_HEIGHT,
    justifyContent: 'center',
    // Borrow card padding so the fixed 300 pt widget fits 360 pt phones.
    marginHorizontal: -SPACING.sm,
    marginTop: SPACING.sm,
  },
  loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  webview: { backgroundColor: 'transparent', flex: 1 },
  retry: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderCurve: 'continuous',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: SPACING.sm,
    minHeight: MIN_TOUCH_SIZE,
    paddingHorizontal: SPACING.lg,
  },
  retryText: { ...TYPE.caption, color: colors.accent, fontWeight: '700' },
  pressed: { opacity: 0.62 },
});
