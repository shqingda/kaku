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

const jsonHeaders = {
  ...authHeaders,
  'Content-Type': 'application/json',
};

test('discussion reads reject invalid topic ids before calling upstream', async () => {
  let upstreamCalls = 0;
  const app = createAuthedApp(async () => {
    upstreamCalls += 1;
    return Response.json({});
  });

  for (const path of [
    '/me/subject-topics/0',
    '/me/group-topics/abc',
    '/me/episodes/-1/comments',
    '/me/reviews/1.5',
  ]) {
    const response = await app.request(path, { headers: authHeaders }, env);
    assert.equal(response.status, 400, path);
    assert.deepEqual(await response.json(), {
      error: 'invalid_topic_id',
      message: '话题编号格式不正确。',
    });
  }

  assert.equal(upstreamCalls, 0);
});

test('discussion replies reject empty, oversize, and malformed bodies', async () => {
  let upstreamCalls = 0;
  const app = createAuthedApp(async () => {
    upstreamCalls += 1;
    return Response.json({ id: 1 });
  });

  const cases = [
    { content: '   ', turnstileToken: 'token' },
    { content: 'x'.repeat(5001), turnstileToken: 'token' },
    { content: 'hello', turnstileToken: '' },
    { content: 'hello', replyTo: 0, turnstileToken: 'token' },
    { content: 'hello', replyTo: 1.5, turnstileToken: 'token' },
    { turnstileToken: 'token' },
  ];

  for (const body of cases) {
    const response = await app.request(
      '/me/subject-topics/12/replies',
      {
        body: JSON.stringify(body),
        headers: jsonHeaders,
        method: 'POST',
      },
      env,
    );
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.equal((await response.json()).error, 'invalid_topic_reply');
  }

  const badId = await app.request(
    '/me/episodes/0/comments',
    {
      body: JSON.stringify({ content: 'hello', turnstileToken: 'token' }),
      headers: jsonHeaders,
      method: 'POST',
    },
    env,
  );
  assert.equal(badId.status, 400);

  assert.equal(upstreamCalls, 0);
});

test('POST /me/subject-topics/:id/replies forwards content, replyTo, and turnstile', async () => {
  const requests = [];
  const app = createAuthedApp(async (input, init) => {
    requests.push({
      body: init?.body,
      method: init?.method,
      url: String(input),
    });
    return Response.json({ id: 88 });
  });

  const response = await app.request(
    '/me/subject-topics/12/replies',
    {
      body: JSON.stringify({
        content: '  楼中楼  ',
        replyTo: 7,
        turnstileToken: 'token',
      }),
      headers: jsonHeaders,
      method: 'POST',
    },
    env,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id: 88 });
  assert.deepEqual(JSON.parse(requests[0].body), {
    content: '楼中楼',
    replyTo: 7,
    turnstileToken: 'token',
  });
  assert.equal(
    requests[0].url,
    'https://next.bgm.tv/p1/subjects/-/topics/12/replies',
  );
});

test('topic creation rejects invalid titles, group names, and missing turnstile', async () => {
  let upstreamCalls = 0;
  const app = createAuthedApp(async () => {
    upstreamCalls += 1;
    return Response.json({ id: 1 });
  });

  const invalidBodies = [
    { title: ' ', content: 'hello', turnstileToken: 'token' },
    { title: 'x'.repeat(121), content: 'hello', turnstileToken: 'token' },
    { title: 'hello', content: '', turnstileToken: 'token' },
    { title: 'hello', content: 'body', turnstileToken: '' },
  ];

  for (const body of invalidBodies) {
    const response = await app.request(
      '/me/subjects/8/topics',
      {
        body: JSON.stringify(body),
        headers: jsonHeaders,
        method: 'POST',
      },
      env,
    );
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.equal((await response.json()).error, 'invalid_topic');
  }

  const badGroup = await app.request(
    '/me/groups/not%20valid/topics',
    {
      body: JSON.stringify({
        title: 'hello',
        content: 'body',
        turnstileToken: 'token',
      }),
      headers: jsonHeaders,
      method: 'POST',
    },
    env,
  );
  assert.equal(badGroup.status, 400);
  assert.equal((await badGroup.json()).error, 'invalid_topic');

  assert.equal(upstreamCalls, 0);
});

test('POST /me/groups/:name/topics forwards a valid group topic', async () => {
  const requests = [];
  const app = createAuthedApp(async (input, init) => {
    requests.push({ body: init?.body, url: String(input) });
    return Response.json({ id: 9 });
  });

  const response = await app.request(
    '/me/groups/a_group-1/topics',
    {
      body: JSON.stringify({
        title: '  标题  ',
        content: '  正文  ',
        turnstileToken: 'token',
      }),
      headers: jsonHeaders,
      method: 'POST',
    },
    env,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id: 9 });
  assert.deepEqual(JSON.parse(requests[0].body), {
    content: '正文',
    title: '标题',
    turnstileToken: 'token',
  });
  assert.equal(
    requests[0].url,
    'https://next.bgm.tv/p1/groups/a_group-1/topics',
  );
});

test('reply deletion and edits validate ids and map 404', async () => {
  let upstreamCalls = 0;
  const app = createAuthedApp(async () => {
    upstreamCalls += 1;
    return new Response(null, { status: 204 });
  });

  const badDelete = await app.request(
    '/me/subject-posts/0',
    { headers: authHeaders, method: 'DELETE' },
    env,
  );
  assert.equal(badDelete.status, 400);
  assert.equal((await badDelete.json()).error, 'invalid_post_id');

  const badEdit = await app.request(
    '/me/group-posts/12',
    {
      body: JSON.stringify({ content: '   ' }),
      headers: jsonHeaders,
      method: 'PUT',
    },
    env,
  );
  assert.equal(badEdit.status, 400);
  assert.equal((await badEdit.json()).error, 'invalid_post');
  assert.equal(upstreamCalls, 0);

  const missing = createAuthedApp(async () => new Response(null, { status: 404 }));
  const deleted = await missing.request(
    '/me/group-posts/12',
    { headers: authHeaders, method: 'DELETE' },
    env,
  );
  assert.equal(deleted.status, 404);
  assert.equal((await deleted.json()).error, 'bangumi_reply_delete_failed');
});

test('discussion writes keep captcha failures distinct from expired OAuth', async () => {
  const captchaState = { credentialDeleted: false };
  const captchaApp = createAuthedApp(
    async () => Response.json({ code: 'CAPTCHA_ERROR' }, { status: 401 }),
    captchaState,
  );
  const replyCaptcha = await captchaApp.request(
    '/me/subject-topics/12/replies',
    {
      body: JSON.stringify({ content: 'hello', turnstileToken: 'token' }),
      headers: jsonHeaders,
      method: 'POST',
    },
    env,
  );
  // 回复路由把非 5xx 的上游失败一律映射为 502，但不会清掉凭证。
  assert.equal(replyCaptcha.status, 502);
  assert.equal((await replyCaptcha.json()).error, 'bangumi_reply_failed');
  assert.equal(captchaState.credentialDeleted, false);

  const topicCaptcha = await captchaApp.request(
    '/me/subjects/8/topics',
    {
      body: JSON.stringify({
        title: 'hello',
        content: 'body',
        turnstileToken: 'token',
      }),
      headers: jsonHeaders,
      method: 'POST',
    },
    env,
  );
  assert.equal(topicCaptcha.status, 400);
  assert.equal((await topicCaptcha.json()).error, 'bangumi_topic_create_failed');
  assert.equal(captchaState.credentialDeleted, false);

  const state = { credentialDeleted: false };
  const oauthApp = createAuthedApp(
    async () => new Response(null, { status: 401 }),
    state,
  );
  const oauth = await oauthApp.request(
    '/me/subject-topics/12/replies',
    {
      body: JSON.stringify({ content: 'hello', turnstileToken: 'token' }),
      headers: jsonHeaders,
      method: 'POST',
    },
    env,
  );
  assert.equal(oauth.status, 409);
  assert.equal(state.credentialDeleted, true);
});

test('restricted topic reads map 404 and 5xx', async () => {
  for (const [status, expected] of [
    [404, 404],
    [500, 503],
    [400, 502],
  ]) {
    const app = createAuthedApp(async () => new Response(null, { status }));
    const response = await app.request(
      '/me/subject-topics/12',
      { headers: authHeaders },
      env,
    );
    assert.equal(response.status, expected, `upstream ${status}`);
    assert.equal((await response.json()).error, 'bangumi_topic_unavailable');
  }
});
