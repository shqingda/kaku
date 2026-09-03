import assert from 'node:assert/strict';
import test from 'node:test';

import { createApp } from '../src/app.ts';
import { encryptSecret } from '../src/auth/crypto.ts';
import {
  BangumiReportError,
  createBangumiReport,
} from '../src/reports/bangumi-client.ts';

const now = 1_800_000_000_000;
const TOKEN_KEY = Buffer.alloc(32, 7).toString('base64url');
const encryptedToken = await encryptSecret('bangumi-access-token', TOKEN_KEY);
const env = {
  BANGUMI_CLIENT_ID: 'kaku-client',
  BANGUMI_CLIENT_SECRET: 'server-only-secret',
  BANGUMI_REDIRECT_URI: 'https://api.kaku.app/auth/bangumi/callback',
  DB: null,
  TOKEN_ENCRYPTION_KEY: TOKEN_KEY,
};
const authHeaders = {
  Authorization: 'Bearer '.concat('x'.repeat(32)),
  'Content-Type': 'application/json',
};

test('reporting a user posts the typed payload to the report endpoint', async () => {
  const fetcher = async (input, init) => {
    assert.equal(String(input), 'https://next.bgm.tv/p1/report');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers.Authorization, 'Bearer bangumi-access-token');
    assert.deepEqual(JSON.parse(init.body), {
      comment: '持续刷屏辱骂',
      id: 424242,
      type: 6,
      value: 1,
    });
    return Response.json({ message: '已提交举报' });
  };

  const result = await createBangumiReport({
    accessToken: 'bangumi-access-token',
    comment: '持续刷屏辱骂',
    fetcher,
    id: 424242,
    reason: 1,
    type: 6,
  });

  assert.deepEqual(result, { message: '已提交举报' });
});

test('reporting maps rate limits to a retry message', async () => {
  const fetcher = async () => new Response('{}', { status: 429 });

  await assert.rejects(
    () =>
      createBangumiReport({
        accessToken: 'bangumi-access-token',
        fetcher,
        id: 1,
        reason: 2,
        type: 6,
      }),
    (error) => {
      assert.ok(error instanceof BangumiReportError);
      assert.equal(error.status, 429);
      assert.equal(error.message, '举报得太频繁了，请稍后再试。');
      return true;
    },
  );
});

test('report route authenticates and reuses the same injected store', async () => {
  let createStoreCalls = 0;
  const store = {
    async authenticateSession() {
      return {
        sessionId: 'session-1',
        user: { id: 42, nickname: 'Kaku', username: 'kaku' },
        userId: 42,
      };
    },
    async deleteBangumiCredential() {},
    async getBangumiCredential() {
      return {
        accessToken: encryptedToken,
        accessTokenExpiresAt: now + 3_600_000,
        refreshToken: 'encrypted-refresh-token',
        updatedAt: now,
        userId: 42,
      };
    },
  };
  const app = createApp({
    createStore: () => {
      createStoreCalls += 1;
      return store;
    },
    fetcher: async (_input, init) => {
      assert.equal(init.headers.Authorization, 'Bearer bangumi-access-token');
      return Response.json({ message: '已提交举报' });
    },
    now: () => now,
  });

  const response = await app.request(
    '/me/reports',
    {
      body: JSON.stringify({ id: 42, reason: 1, type: 6 }),
      headers: authHeaders,
      method: 'POST',
    },
    env,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { message: '已提交举报' });
  assert.equal(createStoreCalls, 1);
});

test('report route rejects malformed bodies before calling upstream', async () => {
  let upstreamCalls = 0;
  const app = createApp({
    createStore() {
      return {
        async authenticateSession() {
          return {
            sessionId: 'session-1',
            user: { id: 42, nickname: 'Kaku', username: 'kaku' },
            userId: 42,
          };
        },
        async getBangumiCredential() {
          throw new Error('credential must not be read');
        },
      };
    },
    fetcher: async () => {
      upstreamCalls += 1;
      return Response.json({ message: 'ok' });
    },
    now: () => now,
  });

  for (const body of [
    { id: 0, reason: 1, type: 6 },
    { id: 42, reason: 1.5, type: 6 },
    { id: 42, reason: 1, type: -1 },
    { id: 42, reason: 1 },
    { id: 42, reason: 1, type: 6, comment: 'x'.repeat(2001) },
    null,
  ]) {
    const response = await app.request(
      '/me/reports',
      {
        body: body === null ? 'not json' : JSON.stringify(body),
        headers: authHeaders,
        method: 'POST',
      },
      env,
    );
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.deepEqual(await response.json(), {
      error: 'invalid_report',
      message: '举报内容格式不正确。',
    });
  }

  assert.equal(upstreamCalls, 0);
});

test('report route maps 429 and 401 from upstream', async () => {
  const limited = createApp({
    createStore() {
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
    },
    fetcher: async () => new Response('{}', { status: 429 }),
    now: () => now,
  });

  const rateLimited = await limited.request(
    '/me/reports',
    {
      body: JSON.stringify({ id: 42, reason: 1, type: 6 }),
      headers: authHeaders,
      method: 'POST',
    },
    env,
  );
  assert.equal(rateLimited.status, 429);
  assert.equal((await rateLimited.json()).error, 'bangumi_report_failed');

  const state = { credentialDeleted: false };
  const expired = createApp({
    createStore() {
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
        async deleteBangumiCredential() {
          state.credentialDeleted = true;
        },
      };
    },
    fetcher: async () => new Response(null, { status: 401 }),
    now: () => now,
  });
  const unauthorized = await expired.request(
    '/me/reports',
    {
      body: JSON.stringify({ id: 42, reason: 1, type: 6, comment: 'spam' }),
      headers: authHeaders,
      method: 'POST',
    },
    env,
  );
  assert.equal(unauthorized.status, 409);
  assert.equal(state.credentialDeleted, true);
});
