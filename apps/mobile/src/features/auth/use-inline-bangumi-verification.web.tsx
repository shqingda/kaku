import { requestBangumiTurnstileToken } from './bangumi-turnstile';

export class InlineVerificationError extends Error {}

// The existing browser flow remains available for Expo web; WebView is native.
export function useInlineBangumiVerification(_active: boolean) {
  return { requestToken: requestBangumiTurnstileToken, verification: null };
}
