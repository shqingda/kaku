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
const authHeaders = { Authorization: 'Bearer '.concat('x'.repeat(32)) };

function createAuthedApp(fetcher, state = { credentialDeleted: false }) {
  return createApp({
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
          return state.credentialDeleted
            ? null
            : {
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
    fetcher,
    now: () => now,
  });
}

function notification(overrides = {}) {
  return {
    createdAt: 1_785_940_000,
    id: 5,
    mainID: 3,
    relatedID: 12,
    sender: {
      avatar: { small: 'https://lain.bgm.tv/a.jpg' },
      nickname: '魂',
      username: 'soul',
    },
    title: '话题有了新回复',
    type: 1,
    unread: true,
    ...overrides,
  };
}

test('GET /me/notifications forwards OAuth server-side and maps unread count', async () => {
  const requests = [];
  const app = createAuthedApp(async (input, init) => {
    requests.push({ url: String(input), authorization: init?.headers?.Authorization });
    return Response.json({
      data: [
        notification(),
        notification({ id: 6, unread: false, relatedID: 0 }),
        notification({
          id: 7,
          mainID: 0,
          relatedID: 0,
          title: '魂',
          type: 14,
          unread: true,
        }),
      ],
      total: 3,
    });
  });

  const response = await app.request(
    '/me/notifications',
    { headers: authHeaders },
    env,
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.total, 3);
  assert.equal(body.unreadCount, 2);
  assert.deepEqual(body.items[0], {
    action: '回复了你的小组话题',
    createdAt: 1_785_940_000,
    id: 5,
    sender: {
      avatarUrl: 'https://lain.bgm.tv/a.jpg',
      nickname: '魂',
      username: 'soul',
    },
    target: { id: 3, kind: 'group-topic', replyId: 12 },
    title: '话题有了新回复',
    unread: true,
  });
  assert.deepEqual(body.items[1].target, { id: 3, kind: 'group-topic' });
  assert.deepEqual(body.items[2], {
    action: '请求加你为好友',
    createdAt: 1_785_940_000,
    id: 7,
    sender: {
      avatarUrl: 'https://lain.bgm.tv/a.jpg',
      nickname: '魂',
      username: 'soul',
    },
    target: { kind: 'user', username: 'soul' },
    title: '',
    unread: true,
  });
  assert.deepEqual(requests, [
    {
      authorization: 'Bearer bangumi-access-token',
      url: 'https://next.bgm.tv/p1/notify?limit=30',
    },
  ]);
});

test('notification routes reject malformed bodies before authenticating upstream calls', async () => {
  let upstreamCalls = 0;
  const app = createAuthedApp(async () => {
    upstreamCalls += 1;
    return Response.json({ data: [], total: 0 });
  });

  for (const body of [
    JSON.stringify({ ids: [0] }),
    JSON.stringify({ ids: [-1] }),
    JSON.stringify({ ids: [1.5] }),
    JSON.stringify({ ids: ['one'] }),
    JSON.stringify({ ids: null }),
    JSON.stringify({ ids: Array.from({ length: 41 }, (_, i) => i + 1) }),
    'not json',
  ]) {
    const response = await app.request(
      '/me/notifications/read',
      {
        body,
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        method: 'POST',
      },
      env,
    );
    assert.equal(response.status, 400, body);
    assert.deepEqual(await response.json(), {
      error: 'invalid_notification_ids',
      message: '通知编号格式不正确。',
    });
  }

  assert.equal(upstreamCalls, 0);
});

test('POST /me/notifications/read forwards selected ids, empty arrays, and all', async () => {
  const requests = [];
  const app = createAuthedApp(async (input, init) => {
    requests.push({ body: init?.body, method: init?.method, url: String(input) });
    return Response.json({});
  });

  const selected = await app.request(
    '/me/notifications/read',
    {
      body: JSON.stringify({ ids: [5, 6] }),
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      method: 'POST',
    },
    env,
  );
  assert.equal(selected.status, 200);
  assert.deepEqual(await selected.json(), {});

  const empty = await app.request(
    '/me/notifications/read',
    {
      body: JSON.stringify({ ids: [] }),
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      method: 'POST',
    },
    env,
  );
  assert.equal(empty.status, 200);

  const all = await app.request(
    '/me/notifications/read',
    {
      body: JSON.stringify({}),
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      method: 'POST',
    },
    env,
  );
  assert.equal(all.status, 200);

  const atLimit = await app.request(
    '/me/notifications/read',
    {
      body: JSON.stringify({
        ids: Array.from({ length: 40 }, (_, i) => i + 1),
      }),
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      method: 'POST',
    },
    env,
  );
  assert.equal(atLimit.status, 200);

  assert.deepEqual(
    requests.map((request) => ({
      body: JSON.parse(request.body),
      method: request.method,
      url: request.url,
    })),
    [
      { body: { id: [5, 6] }, method: 'POST', url: 'https://next.bgm.tv/p1/clear-notify' },
      { body: {}, method: 'POST', url: 'https://next.bgm.tv/p1/clear-notify' },
      { body: {}, method: 'POST', url: 'https://next.bgm.tv/p1/clear-notify' },
      {
        body: { id: Array.from({ length: 40 }, (_, i) => i + 1) },
        method: 'POST',
        url: 'https://next.bgm.tv/p1/clear-notify',
      },
    ],
  );
});

test('notification routes require a session', async () => {
  const app = createApp({
    createStore() {
      return {
        async authenticateSession() {
          return null;
        },
      };
    },
    fetcher: async () => {
      throw new Error('upstream must not be called');
    },
    now: () => now,
  });

  const list = await app.request('/me/notifications', {}, env);
  assert.equal(list.status, 401);
  assert.deepEqual(await list.json(), {
    error: 'unauthorized',
    message: '请先登录 Kaku。',
  });

  const mark = await app.request(
    '/me/notifications/read',
    {
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    },
    env,
  );
  assert.equal(mark.status, 401);
});

test('notification routes clear the credential on upstream 401', async () => {
  const state = { credentialDeleted: false };
  const app = createAuthedApp(
    async () => new Response(null, { status: 401 }),
    state,
  );

  const list = await app.request(
    '/me/notifications',
    { headers: authHeaders },
    env,
  );
  assert.equal(list.status, 409);
  assert.deepEqual(await list.json(), {
    error: 'bangumi_reauthorization_required',
    message: 'Bangumi 授权已失效，请重新登录。',
  });
  assert.equal(state.credentialDeleted, true);

  const markState = { credentialDeleted: false };
  const markApp = createAuthedApp(
    async () => new Response(null, { status: 401 }),
    markState,
  );
  const mark = await markApp.request(
    '/me/notifications/read',
    {
      body: JSON.stringify({ ids: [5] }),
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      method: 'POST',
    },
    env,
  );
  assert.equal(mark.status, 409);
  assert.equal(markState.credentialDeleted, true);
});

test('notification routes map upstream failures to 503 and 502', async () => {
  for (const [path, init, upstreamStatus, expectedStatus] of [
    ['/me/notifications', { headers: authHeaders }, 500, 503],
    ['/me/notifications', { headers: authHeaders }, 400, 502],
    ['/me/notifications', { headers: authHeaders }, 429, 502],
    [
      '/me/notifications/read',
      {
        body: JSON.stringify({}),
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        method: 'POST',
      },
      503,
      503,
    ],
    [
      '/me/notifications/read',
      {
        body: JSON.stringify({ ids: [5] }),
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        method: 'POST',
      },
      400,
      502,
    ],
  ]) {
    const app = createAuthedApp(
      async () => new Response(null, { status: upstreamStatus }),
    );
    const response = await app.request(path, init, env);
    assert.equal(
      response.status,
      expectedStatus,
      `${init.method ?? 'GET'} ${path} upstream ${upstreamStatus}`,
    );
    const body = await response.json();
    assert.equal(body.error, 'bangumi_notifications_unavailable');
  }
});
