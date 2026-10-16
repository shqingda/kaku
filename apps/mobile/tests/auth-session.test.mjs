import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isSessionActive,
  parseStoredAuthSession,
} from '../src/features/auth/auth-session.ts';

import { getHandoffCallback } from '../src/features/auth/login-attempt.ts';

test('OAuth callback exposes only the one-time handoff code', () => {
  assert.equal(
    getHandoffCallback(
      'kaku://auth/callback?code=abcdefghijklmnopqrstuvwxyz123456&request_id=498e27b7-5192-48ce-9b13-f4a27f10f806',
    ).code,
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
