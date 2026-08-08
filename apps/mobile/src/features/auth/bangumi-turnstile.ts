import * as WebBrowser from 'expo-web-browser';

import {
  getTurnstileCallbackUrl,
  getTurnstileTokenFromCallback,
} from './turnstile-callback';

const BANGUMI_TURNSTILE_URL = 'https://next.bgm.tv/p1/turnstile';

export async function requestBangumiTurnstileToken() {
  const callbackUrl = getTurnstileCallbackUrl();
  const challengeUrl = new URL(BANGUMI_TURNSTILE_URL);
  challengeUrl.searchParams.set('redirect_uri', callbackUrl);
  challengeUrl.searchParams.set('theme', 'light');

  const availability = await fetch(challengeUrl, {
    headers: { Accept: 'text/html' },
    signal: AbortSignal.timeout(12_000),
  });

  if (!availability.ok) {
    throw new Error('Bangumi 暂未允许 Kaku 完成发布安全验证。');
  }

  const result = await WebBrowser.openAuthSessionAsync(
    challengeUrl.toString(),
    callbackUrl,
  );

  if (result.type !== 'success') {
    throw new Error('安全验证未完成，内容没有发送。');
  }

  return getTurnstileTokenFromCallback(result.url);
}
