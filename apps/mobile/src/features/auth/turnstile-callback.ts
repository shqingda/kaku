const TURNSTILE_CALLBACK_URL = 'kaku://auth/turnstile';

export function getTurnstileCallbackUrl() {
  return TURNSTILE_CALLBACK_URL;
}

export function getTurnstileTokenFromCallback(callbackUrl: string) {
  const callback = new URL(callbackUrl);
  const expected = new URL(TURNSTILE_CALLBACK_URL);

  if (
    callback.protocol !== expected.protocol ||
    callback.host !== expected.host ||
    callback.pathname !== expected.pathname
  ) {
    throw new Error('安全验证返回了无效地址。');
  }

  const token = callback.searchParams.get('token')?.trim();

  if (!token) {
    throw new Error('安全验证没有返回有效凭据。');
  }

  return token;
}
