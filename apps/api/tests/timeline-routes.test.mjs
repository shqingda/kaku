import assert from 'node:assert/strict';
import test from 'node:test';

import { createApp } from '../src/app.ts';
import { encryptSecret } from '../src/auth/crypto.ts';

const now = 1_800_000_000_000;
const TOKEN_KEY = Buffer.alloc(32, 7).toString('base64url');
const env = {
  BANGUMI_CLIENT_ID: 'kaku-client',
  BANGUMI_CLIENT_SECRET: 'server-only-secret',
  BANGUMI_REDIRECT_URI: 'https://api.kaku.app/auth/bangumi/callback',
  DB: null,
  TOKEN_ENCRYPTION_KEY: TOKEN_KEY,
};

const encryptedToken = await encryptSecret('bangumi-access-token', TOKEN_KEY);

function createStore() {
  return {
    async authenticateSession() {
      return {
        sessionId: 'session-1',
        user: { id: 42, nickname: 'Kaku', username: 'kaku' },
        userId: 42,
      };
    },
    async getBangumiCredential() {
      return {
        accessToken: encryptedToken,
        accessTokenExpiresAt: now + 3_600_000,
        refreshToken: 'encrypted-refresh-token',
        updatedAt: now,
        userId: 42,
      };
    },
    async deleteBangumiCredential() {},
  };
}

const timelineItem = {
  batch: false,
  cat: 3,
  createdAt: 1_785_940_000,
  id: 77,
  memo: {
    subject: [
      { comment: '', subject: { id: 100, name: 'Test', type: 2 } },
    ],
  },
  replies: 0,
  type: 5,
  user: { avatar: { small: 'https://lain.bgm.tv/a.jpg' }, nickname: '魂', username: 'soul' },
};

function timelineFetch() {
  return async (input, options) => {
    const url = String(input);
    if (!url.includes('/p1/timeline')) {
      throw new Error(`Unexpected request: ${url}`);
    }

    if (options?.method === 'POST') {
      return Response.json({ id: 123 });
    }

    return Response.json([timelineItem]);
  };
}

function authedApp() {
  return createApp({ createStore, fetcher: timelineFetch(), now: () => now });
}

const authHeaders = {
  Authorization: 'Bearer '.concat('x'.repeat(32)),
};

test('GET /me/timeline returns the mapped friend timeline', async () => {
  const response = await authedApp().request('/me/timeline', {
    headers: authHeaders,
  }, env);

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.items.length, 1);
  assert.equal(body.items[0].id, 77);
  assert.equal(body.items[0].subjectId, 100);
  assert.equal(body.items[0].subjectTitle, 'Test');
});

test('GET /me/timeline rejects a malformed cursor', async () => {
  const response = await authedApp().request('/me/timeline?until=abc', {
    headers: authHeaders,
  }, env);

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: 'invalid_timeline_cursor',
    message: '好友动态分页位置无效。',
  });
});

test('POST /me/timeline rejects empty content', async () => {
  const response = await authedApp().request(
    '/me/timeline',
    {
      body: JSON.stringify({ content: '  ', turnstileToken: 'token' }),
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      method: 'POST',
    },
    env,
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: 'invalid_timeline_post',
    message: '动态需为 1–380 个字符，并完成安全验证。',
  });
});

test('POST /me/timeline publishes a say', async () => {
  const response = await authedApp().request(
    '/me/timeline',
    {
      body: JSON.stringify({ content: 'hello', turnstileToken: 'token' }),
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      method: 'POST',
    },
    env,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id: 123 });
});
