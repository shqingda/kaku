import assert from 'node:assert/strict';
import test from 'node:test';

import { hashToken } from '../src/auth/crypto.ts';
import {
  authenticateRequest,
  isAuthenticationResponse,
} from '../src/auth/session-service.ts';

const now = 1_800_000_000_000;

function contextWithAuthorization(header) {
  return {
    req: { header: (name) => (name === 'Authorization' ? header : undefined) },
    json: (body, status) => Response.json(body, { status }),
  };
}

function createStore({ session = null } = {}) {
  return {
    async authenticateSession() {
      return session;
    },
  };
}

test('rejects requests without a bearer token', async () => {
  const result = await authenticateRequest(
    contextWithAuthorization(undefined),
    createStore(),
    now,
  );

  assert.ok(isAuthenticationResponse(result));
  assert.equal(result.status, 401);
  assert.deepEqual(await result.json(), {
    error: 'unauthorized',
    message: '请先登录 Kaku。',
  });
});

test('rejects tokens that are too short to be real', async () => {
  const result = await authenticateRequest(
    contextWithAuthorization('Bearer short'),
    createStore(),
    now,
  );

  assert.ok(isAuthenticationResponse(result));
  assert.equal(result.status, 401);
  assert.deepEqual(await result.json(), {
    error: 'invalid_session',
    message: '登录凭证格式不正确。',
  });
});

test('rejects tokens whose session no longer exists', async () => {
  const result = await authenticateRequest(
    contextWithAuthorization('Bearer '.concat('x'.repeat(32))),
    createStore({ session: null }),
    now,
  );

  assert.ok(isAuthenticationResponse(result));
  assert.equal(result.status, 401);
  assert.deepEqual(await result.json(), {
    error: 'session_expired',
    message: '登录已过期，请刷新或重新登录。',
  });
});

test('returns the session for a valid token', async () => {
  const token = 'a'.repeat(32);
  const session = {
    sessionId: 'session-1',
    user: { id: 42, nickname: 'Kaku', username: 'kaku' },
    userId: 42,
  };
  const tokenHash = await hashToken(token);

  const result = await authenticateRequest(
    contextWithAuthorization(`Bearer ${token}`),
    createStore({ session }),
    now,
  );

  assert.ok(!isAuthenticationResponse(result));
  assert.deepEqual(result, { ...session, tokenHash });
});
