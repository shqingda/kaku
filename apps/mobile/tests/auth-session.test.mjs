import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getHandoffCode,
  isSessionActive,
  parseStoredAuthSession,
} from '../src/features/auth/auth-session.ts';

test('OAuth callback exposes only the one-time handoff code', () => {
  assert.equal(
    getHandoffCode(
      'kaku://auth/callback?code=abcdefghijklmnopqrstuvwxyz123456',
    ),
    'abcdefghijklmnopqrstuvwxyz123456',
  );
});

test('expired sessions are not restored on app launch', () => {
  assert.equal(isSessionActive(2_000, 1_999), true);
  assert.equal(isSessionActive(2_000, 2_000), false);
});

test('malformed stored sessions are discarded instead of breaking app launch', () => {
  assert.equal(parseStoredAuthSession('{broken-json'), null);
  assert.equal(parseStoredAuthSession(JSON.stringify({ sessionToken: 'short' })), null);
});
