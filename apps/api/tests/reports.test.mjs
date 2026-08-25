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
