import assert from 'node:assert/strict';
import test from 'node:test';

import { createApp } from '../src/app.ts';
import { encryptSecret } from '../src/auth/crypto.ts';

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

function countingStore() {
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

  return {
    get createStoreCalls() {
      return createStoreCalls;
    },
    createStore() {
      createStoreCalls += 1;
      return store;
    },
  };
}

async function requestAuthed(path, { method = 'GET', body, fetcher } = {}) {
  const counted = countingStore();
  const app = createApp({
    createStore: counted.createStore,
    fetcher,
    now: () => now,
  });
  const response = await app.request(
    path,
    {
      body,
      headers: authHeaders,
      method,
    },
    env,
  );

  return { counted, response };
}

test('collection reads reuse the same injected auth store', async () => {
  const { counted, response } = await requestAuthed('/me/collections/42', {
    fetcher: async (input) => {
      const url = String(input);
      if (url.includes('/users/kaku/collections/42')) {
        return Response.json({
          comment: '',
          ep_status: 0,
          private: false,
          rate: 0,
          subject_id: 42,
          subject_type: 1,
          tags: [],
          type: 3,
          vol_status: 0,
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    },
  });

  assert.equal(response.status, 200);
  assert.equal(counted.createStoreCalls, 1);
});

test('timeline reads reuse the same injected auth store', async () => {
  const { counted, response } = await requestAuthed('/me/timeline', {
    fetcher: async () => Response.json([]),
  });

  assert.equal(response.status, 200);
  assert.equal(counted.createStoreCalls, 1);
});

test('discussion reads reuse the same injected auth store', async () => {
  const { counted, response } = await requestAuthed('/me/subject-topics/22447', {
    fetcher: async () =>
      Response.json({
        createdAt: now / 1000,
        creator: { id: 1, nickname: '测试用户', username: 'tester' },
        creatorID: 1,
        id: 22447,
        parentID: 123,
        replies: [],
        replyCount: 0,
        title: '登录后可见的话题',
        updatedAt: now / 1000,
      }),
  });

  assert.equal(response.status, 200);
  assert.equal(counted.createStoreCalls, 1);
});

test('index writes reuse the same injected auth store', async () => {
  const { counted, response } = await requestAuthed('/me/indexes', {
    body: JSON.stringify({ title: '测试目录' }),
    fetcher: async () => Response.json({ id: 9, title: '测试目录' }),
    method: 'POST',
  });

  assert.equal(response.status, 200);
  assert.equal(counted.createStoreCalls, 1);
});
