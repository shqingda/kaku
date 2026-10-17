import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { SPACING, TYPE } from '@/constants/design';
import { useTheme } from '@/features/theme/theme-provider';
import { allowTurnstileNavigation, parseTurnstileMessage, TURNSTILE_BRIDGE, TURNSTILE_PAGE_URL } from './inline-turnstile-bridge';

export class InlineVerificationError extends Error {}

type Pending = { id: number; resolve: (token: string) => void; reject: (error: Error) => void };

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
    verification: attempt === null ? null : <InlineChallenge key={attempt} onFinish={result => finish(attempt, result)} />,
  };
}

function InlineChallenge({ onFinish }: { onFinish: (result: string | Error) => void }) {
  const colors = useTheme();
  const [interactive, setInteractive] = useState(false);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  useEffect(() => {
    // Bound automatic work and give the user longer when interaction is required.
    const timer = setTimeout(() => finishRef.current(new InlineVerificationError('安全验证超时，请重新发布。')), interactive ? 120_000 : 30_000);
    return () => clearTimeout(timer);
  }, [interactive]);

  const fail = (message: string) => onFinish(new InlineVerificationError(message));
  return <View>
    {interactive ? <Text accessibilityLiveRegion="polite" style={[styles.text, { color: colors.muted }]}>
      请完成下方安全验证
    </Text> : null}
    <View
      accessibilityElementsHidden={!interactive}
      importantForAccessibility={interactive ? 'auto' : 'no-hide-descendants'}
      pointerEvents={interactive ? 'auto' : 'none'}
      style={interactive ? styles.challenge : styles.automatic}
    >
      <WebView
        source={{ uri: TURNSTILE_PAGE_URL }}
        injectedJavaScript={TURNSTILE_BRIDGE}
        javaScriptEnabled
        domStorageEnabled
        // Gate every navigation ourselves; otherwise WebView opens rejected
        // schemes in the system browser before calling our navigation handler.
        originWhitelist={['*']}
        onShouldStartLoadWithRequest={request => allowTurnstileNavigation(request.url, request.isTopFrame !== false)}
        onOpenWindow={() => { /* Never open links outside the verification view. */ }}
        onMessage={({ nativeEvent }) => {
          const message = parseTurnstileMessage(nativeEvent.url, nativeEvent.data);
          if (!message) return;
          if (message.type === 'token') onFinish(message.token);
          else if (message.type === 'interactive') { Keyboard.dismiss(); setInteractive(true); }
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
