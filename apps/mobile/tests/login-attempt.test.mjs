import assert from 'node:assert/strict';
import test from 'node:test';
import { getHandoffCallback, parsePendingLogin } from '../src/features/auth/login-attempt.ts';

const requestId = '498e27b7-5192-48ce-9b13-f4a27f10f806';
const attempt = { codeVerifier: 'A'.repeat(43), requestId, createdAt: 1_000 };

test('callbacks must target the app login route and identify the local request', () => {
  const callback = `kaku://auth/callback?code=${'C'.repeat(20)}&request_id=${requestId}`;
  assert.deepEqual(getHandoffCallback(callback), { code: 'C'.repeat(20), requestId });
  for (const url of [callback.replace('kaku:', 'https:'), callback.replace('/callback?', '/other?'), callback.replace(`&request_id=${requestId}`, ''), `${callback}&request_id=${requestId}`]) {
    assert.throws(() => getHandoffCallback(url));
  }
});

test('pending login proof expires and malformed stored data is rejected', () => {
  assert.deepEqual(parsePendingLogin(JSON.stringify(attempt), 1_001), attempt);
  assert.equal(parsePendingLogin(JSON.stringify(attempt), 301_000), null);
  assert.equal(parsePendingLogin(JSON.stringify(attempt), 999), null);
  assert.equal(parsePendingLogin('{broken', 1_001), null);
  assert.equal(parsePendingLogin(JSON.stringify({ ...attempt, codeVerifier: 'short' }), 1_001), null);
});
