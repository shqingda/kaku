import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { SPACING, TYPE } from '@/constants/design';
import { useTheme } from '@/features/theme/theme-provider';
import {
  allowTurnstileNavigation,
  parseTurnstileMessage,
  TURNSTILE_BRIDGE,
  TURNSTILE_PAGE_URL,
  turnstileTokenFromRedirect,
} from './inline-turnstile-bridge';
import { isTurnstileTokenFresh, VERIFICATION_LIMITS } from './inline-verification-timing';

export class InlineVerificationError extends Error {}

type Waiter = { resolve: (token: string) => void; reject: (error: Error) => void };
type Challenge = { id: number; foreground: boolean };

// Verification starts as soon as a composer opens, so the Cloudflare check
// runs while the user writes instead of after they tap 发布. A token is
// single-use and valid for five minutes; a stale one is never sent.
export function useInlineBangumiVerification(active: boolean) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const challengeRef = useRef<Challenge | null>(null);
  const waiter = useRef<Waiter | null>(null);
  const token = useRef<{ value: string; at: number } | null>(null);
  const nextId = useRef(0);
  // One quiet attempt per opening: a failed prefetch waits for the user.
  const prefetchAllowed = useRef(false);
  const activeRef = useRef(active);
  activeRef.current = active;

  const show = useCallback((next: Challenge | null) => {
    challengeRef.current = next;
    setChallenge(next);
  }, []);

  const finish = useCallback((id: number, result: string | Error) => {
    if (challengeRef.current?.id !== id) return;
    show(null);
    const current = waiter.current;
    waiter.current = null;
    if (typeof result === 'string') {
      if (current) current.resolve(result);
      else token.current = { value: result, at: Date.now() };
    } else if (current) {
      current.reject(result);
    } else {
      prefetchAllowed.current = false;
    }
  }, [show]);

  const start = useCallback((foreground: boolean) => {
    show({ id: ++nextId.current, foreground });
  }, [show]);

  useEffect(() => {
    if (active) {
      prefetchAllowed.current = true;
      return;
    }
    prefetchAllowed.current = false;
    token.current = null;
    const current = waiter.current;
    waiter.current = null;
    if (challengeRef.current) show(null);
    current?.reject(new InlineVerificationError('验证已结束，内容没有发送。'));
  }, [active, show]);

  // Prefetch on open, and again after a token is used (replies can be sent
  // one after another from the same composer).
  useEffect(() => {
    if (active && !challenge && !token.current && !waiter.current && prefetchAllowed.current) {
      start(false);
    }
  }, [active, challenge, start]);

  useEffect(() => () => {
    const current = waiter.current;
    waiter.current = null;
    current?.reject(new InlineVerificationError('验证已结束，内容没有发送。'));
  }, []);

  const requestToken = useCallback(() => new Promise<string>((resolve, reject) => {
    if (!activeRef.current) { reject(new InlineVerificationError('编辑器已关闭，内容没有发送。')); return; }
    if (waiter.current) { reject(new InlineVerificationError('安全验证正在进行，请稍候。')); return; }
    const cached = token.current;
    token.current = null;
    if (cached && isTurnstileTokenFresh(cached.at, Date.now())) {
      prefetchAllowed.current = true;
      resolve(cached.value);
      return;
    }
    waiter.current = { resolve, reject };
    const current = challengeRef.current;
    // Join the check already running in the background instead of restarting it.
    if (current) show({ id: current.id, foreground: true });
    else start(true);
  }), [show, start]);

  const cancel = useCallback(() => {
    const current = challengeRef.current;
    if (!current || !waiter.current) return;
    prefetchAllowed.current = false;
    finish(current.id, new InlineVerificationError('已取消发布，内容没有发送。'));
  }, [finish]);

  return {
    requestToken,
    cancel: challenge?.foreground ? cancel : undefined,
    verification: challenge === null ? null : (
      <InlineChallenge
        foreground={challenge.foreground}
        key={challenge.id}
        onFinish={result => finish(challenge.id, result)}
      />
    ),
  };
}

function InlineChallenge({
  foreground,
  onFinish,
}: {
  foreground: boolean;
  onFinish: (result: string | Error) => void;
}) {
  const colors = useTheme();
  const [interactive, setInteractive] = useState(false);
  // Only interrupt the user once they asked to publish.
  const revealed = interactive && foreground;
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  useEffect(() => {
    const limit = !foreground
      ? VERIFICATION_LIMITS.background
      : interactive
        ? VERIFICATION_LIMITS.interactive
        : VERIFICATION_LIMITS.automatic;
    const timer = setTimeout(() => finishRef.current(new InlineVerificationError('安全验证超时，请重新发布。')), limit);
    return () => clearTimeout(timer);
  }, [foreground, interactive]);
  useEffect(() => {
    if (revealed) Keyboard.dismiss();
  }, [revealed]);

  const fail = (message: string) => onFinish(new InlineVerificationError(message));
  return <View>
    {revealed ? <Text accessibilityLiveRegion="polite" style={[styles.text, { color: colors.muted }]}>
      请完成下方安全验证
    </Text> : null}
    <View
      accessibilityElementsHidden={!revealed}
      importantForAccessibility={revealed ? 'auto' : 'no-hide-descendants'}
      pointerEvents={revealed ? 'auto' : 'none'}
      style={revealed ? styles.challenge : styles.automatic}
    >
      <WebView
        source={{ uri: TURNSTILE_PAGE_URL }}
        injectedJavaScript={TURNSTILE_BRIDGE}
        javaScriptEnabled
        domStorageEnabled
        // Gate every navigation ourselves; otherwise WebView opens rejected
        // schemes in the system browser before calling our navigation handler.
        originWhitelist={['*']}
        onShouldStartLoadWithRequest={request => {
          // If the page's own widget finishes first (late script injection),
          // its redirect still carries a valid token.
          const redirected = turnstileTokenFromRedirect(request.url);
          if (redirected) { onFinish(redirected); return false; }
          return allowTurnstileNavigation(request.url, request.isTopFrame !== false);
        }}
        onOpenWindow={() => { /* Never open links outside the verification view. */ }}
        onMessage={({ nativeEvent }) => {
          const message = parseTurnstileMessage(nativeEvent.url, nativeEvent.data);
          if (!message) return;
          if (message.type === 'token') onFinish(message.token);
          else if (message.type === 'interactive') setInteractive(true);
          else if (message.type === 'expired' || message.type === 'timeout') fail('安全验证已过期，请重新发布。');
          else fail('安全验证未通过，请重新发布以重试。');
        }}
        onError={() => fail('无法连接安全验证服务，请检查网络后重新发布。')}
        onHttpError={({ nativeEvent }) => {
          // Cloudflare subresources can return 401 during normal PAT negotiation.
          if (allowTurnstileNavigation(nativeEvent.url, true)) fail('安全验证服务暂时不可用，请稍后重新发布。');
        }}
        onContentProcessDidTerminate={() => fail('安全验证已中断，请重新发布。')}
        onRenderProcessGone={() => fail('安全验证已中断，请重新发布。')}
        scrollEnabled={false}
        style={styles.webview}
      />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  text: { ...TYPE.caption, flexShrink: 1 },
  // Keep a real viewport while automatic checks run; revealing it does not
  // remount the browser or lose the in-progress challenge.
  automatic: { position: 'absolute', opacity: 0, width: '100%', height: 100 },
  challenge: { height: 100, marginTop: SPACING.sm },
  webview: { flex: 1, backgroundColor: 'transparent' },
});
