import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import {
  getTurnstileCallbackUrl,
  getTurnstileTokenFromCallback,
} from './turnstile-callback';

const BANGUMI_TURNSTILE_URL = 'https://next.bgm.tv/p1/turnstile';

export async function requestBangumiTurnstileToken() {
  const callbackUrl = getTurnstileCallbackUrl();
  const challengeUrl = new URL(BANGUMI_TURNSTILE_URL);
  challengeUrl.searchParams.set('redirect_uri', callbackUrl);
  challengeUrl.searchParams.set('theme', 'auto');

  if (Platform.OS === 'android') {
    await WebBrowser.warmUpAsync();
  }

  let result: Awaited<ReturnType<typeof WebBrowser.openAuthSessionAsync>>;

  try {
    result = await WebBrowser.openAuthSessionAsync(
      challengeUrl.toString(),
      callbackUrl,
    );
  } finally {
    if (Platform.OS === 'android') {
      await WebBrowser.coolDownAsync();
    }
  }

  if (result.type !== 'success') {
    throw new Error('安全验证未完成，内容没有发送。');
  }

  return getTurnstileTokenFromCallback(result.url);
}
