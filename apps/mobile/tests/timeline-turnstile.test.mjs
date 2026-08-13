import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getTurnstileTokenFromCallback,
  isTurnstileCallbackUrl,
  redirectTurnstileSystemPath,
} from '../src/features/auth/turnstile-callback.ts';

test('Bangumi Turnstile callback accepts only the Kaku callback URL', () => {
  assert.equal(
    getTurnstileTokenFromCallback(
      'kaku://auth/turnstile?token=single-use-token',
    ),
    'single-use-token',
  );
  assert.throws(
    () =>
      getTurnstileTokenFromCallback(
        'https://example.com/auth/turnstile?token=stolen-token',
      ),
    /无效地址/,
  );
});

test('Turnstile callback is consumed without navigating Expo Router', () => {
  const callback = 'kaku://auth/turnstile?token=verified-token';

  assert.equal(isTurnstileCallbackUrl(callback), true);
  assert.equal(redirectTurnstileSystemPath(callback), null);
});

test('native intent preserves unrelated deep links', () => {
  const subjectLink = 'kaku://subject/400602';

  assert.equal(isTurnstileCallbackUrl(subjectLink), false);
  assert.equal(redirectTurnstileSystemPath(subjectLink), subjectLink);
});
