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
  const requests = [];
  const app = createApp({
    createStore,
    fetcher: async (input, options) => {
      requests.push({
        body: options?.body,
        method: options?.method,
        url: String(input),
      });
      return Response.json({ id: 123 });
    },
    now: () => now,
  });

  const response = await app.request(
    '/me/timeline',
    {
      body: JSON.stringify({ content: '  hello  ', turnstileToken: 'token' }),
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      method: 'POST',
    },
    env,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id: 123 });
  assert.deepEqual(JSON.parse(requests[0].body), {
    content: 'hello',
    turnstileToken: 'token',
  });
  assert.equal(requests[0].url, 'https://next.bgm.tv/p1/timeline');
});

test('GET /me/timeline rejects zero, negative, and non-integer cursors', async () => {
  for (const until of ['0', '-1', '1.5', '']) {
    const response = await authedApp().request(`/me/timeline?until=${until}`, {
      headers: authHeaders,
    }, env);
    assert.equal(response.status, 400, until);
    assert.deepEqual(await response.json(), {
      error: 'invalid_timeline_cursor',
      message: '好友动态分页位置无效。',
    });
  }
});

test('GET /me/timeline forwards a valid cursor', async () => {
  const requested = [];
  const app = createApp({
    createStore,
    fetcher: async (input) => {
      requested.push(String(input));
      return Response.json([timelineItem]);
    },
    now: () => now,
  });

  const response = await app.request('/me/timeline?until=77', {
    headers: authHeaders,
  }, env);
  assert.equal(response.status, 200);
  assert.equal(
    requested[0],
    'https://next.bgm.tv/p1/timeline?mode=friends&limit=20&until=77',
  );
});

test('POST /me/timeline rejects oversize content and missing turnstile', async () => {
  const cases = [
    { content: 'x'.repeat(381), turnstileToken: 'token' },
    { content: 'hello', turnstileToken: '' },
    { content: 'hello', turnstileToken: 't'.repeat(2049) },
    { content: 'hello' },
    { turnstileToken: 'token' },
    { content: 12, turnstileToken: 'token' },
  ];

  for (const body of cases) {
    const response = await authedApp().request(
      '/me/timeline',
      {
        body: JSON.stringify(body),
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        method: 'POST',
      },
      env,
    );
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.equal((await response.json()).error, 'invalid_timeline_post');
  }

  const atLimit = await authedApp().request(
    '/me/timeline',
    {
      body: JSON.stringify({
        content: 'x'.repeat(380),
        turnstileToken: 't'.repeat(2048),
      }),
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      method: 'POST',
    },
    env,
  );
  assert.equal(atLimit.status, 200);
});

test('POST /me/timeline keeps captcha failures distinct from expired OAuth', async () => {
  const captchaApp = createApp({
    createStore,
    fetcher: async () =>
      Response.json({ code: 'CAPTCHA_ERROR' }, { status: 401 }),
    now: () => now,
  });
  const captcha = await captchaApp.request(
    '/me/timeline',
    {
      body: JSON.stringify({ content: 'hello', turnstileToken: 'token' }),
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      method: 'POST',
    },
    env,
  );
  assert.equal(captcha.status, 400);
  assert.equal((await captcha.json()).error, 'bangumi_timeline_publish_failed');

  const state = { deleted: false };
  const oauthApp = createApp({
    createStore() {
      const store = createStore();
      return {
        ...store,
        async deleteBangumiCredential() {
          state.deleted = true;
        },
      };
    },
    fetcher: async () => new Response(null, { status: 401 }),
    now: () => now,
  });
  const oauth = await oauthApp.request(
    '/me/timeline',
    {
      body: JSON.stringify({ content: 'hello', turnstileToken: 'token' }),
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      method: 'POST',
    },
    env,
  );
  assert.equal(oauth.status, 409);
  assert.equal(state.deleted, true);
});

test('GET /me/timeline maps upstream 5xx and 4xx', async () => {
  for (const [status, expected] of [
    [500, 503],
    [400, 502],
  ]) {
    const app = createApp({
      createStore,
      fetcher: async () => new Response(null, { status }),
      now: () => now,
    });
    const response = await app.request('/me/timeline', { headers: authHeaders }, env);
    assert.equal(response.status, expected, `upstream ${status}`);
    assert.equal((await response.json()).error, 'bangumi_timeline_unavailable');
  }
});

test('DELETE /me/timeline/:id validates the id and turnstile before calling upstream', async () => {
  let upstreamCalls = 0;
  const app = createApp({
    createStore,
    fetcher: async () => {
      upstreamCalls += 1;
      return new Response(null, { status: 204 });
    },
    now: () => now,
  });

  for (const [path, body] of [
    ['/me/timeline/0', { turnstileToken: 'token' }],
    ['/me/timeline/abc', { turnstileToken: 'token' }],
    ['/me/timeline/12', {}],
    ['/me/timeline/12', { turnstileToken: '' }],
  ]) {
    const response = await app.request(
      path,
      {
        body: JSON.stringify(body),
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        method: 'DELETE',
      },
      env,
    );
    assert.equal(response.status, 400, path);
    assert.equal((await response.json()).error, 'invalid_timeline_delete');
  }
  assert.equal(upstreamCalls, 0);
});

test('DELETE /me/timeline/:id forwards the turnstile token and maps 404', async () => {
  const requests = [];
  const app = createApp({
    createStore,
    fetcher: async (input, init) => {
      requests.push({
        body: init?.body,
        method: init?.method,
        url: String(input),
      });
      return new Response(null, { status: 204 });
    },
    now: () => now,
  });

  const deleted = await app.request(
    '/me/timeline/77',
    {
      body: JSON.stringify({ turnstileToken: 'token' }),
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      method: 'DELETE',
    },
    env,
  );
  assert.equal(deleted.status, 200);
  assert.deepEqual(await deleted.json(), { deleted: true });
  assert.deepEqual(JSON.parse(requests[0].body), { turnstileToken: 'token' });
  assert.equal(requests[0].url, 'https://next.bgm.tv/p1/timeline/77');

  const missing = createApp({
    createStore,
    fetcher: async () => new Response(null, { status: 404 }),
    now: () => now,
  });
  const notFound = await missing.request(
    '/me/timeline/77',
    {
      body: JSON.stringify({ turnstileToken: 'token' }),
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      method: 'DELETE',
    },
    env,
  );
  assert.equal(notFound.status, 404);
  assert.equal((await notFound.json()).error, 'bangumi_timeline_delete_failed');
});
