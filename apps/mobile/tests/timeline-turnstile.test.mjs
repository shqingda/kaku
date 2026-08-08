import assert from 'node:assert/strict';
import test from 'node:test';

import { getTurnstileTokenFromCallback } from '../src/features/timeline/turnstile-callback.ts';

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
