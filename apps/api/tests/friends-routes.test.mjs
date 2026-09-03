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

test('friendship read route maps the private profile to isFriend', async () => {
  const requested = [];
  const app = createAuthedApp(async (input, init) => {
    requested.push({
      authorization: init?.headers?.Authorization,
      method: init?.method ?? 'GET',
      url: String(input),
    });
    return Response.json({ isFriend: true });
  });

  const response = await app.request(
    '/me/users/sai',
    { headers: authHeaders },
    env,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { isFriend: true });
  assert.deepEqual(requested, [
    {
      authorization: 'Bearer bangumi-access-token',
      method: 'GET',
      url: 'https://next.bgm.tv/p1/users/sai',
    },
  ]);
});

test('friendship read treats a missing isFriend flag as not friends', async () => {
  const app = createAuthedApp(async () => Response.json({}));
  const response = await app.request(
    '/me/users/sai',
    { headers: authHeaders },
    env,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { isFriend: false });
});

test('friend routes accept the username alphabet and length bounds', async () => {
  const requested = [];
  const app = createAuthedApp(async (input) => {
    requested.push(String(input));
    return Response.json({ isFriend: false });
  });

  for (const username of ['a', 'Z', '0', '_', '-', 'user_name-1', 'x'.repeat(32)]) {
    const response = await app.request(
      `/me/users/${username}`,
      { headers: authHeaders },
      env,
    );
    assert.equal(response.status, 200, username);
  }

  assert.deepEqual(
    requested,
    [
      'a',
      'Z',
      '0',
      '_',
      '-',
      'user_name-1',
      'x'.repeat(32),
    ].map((username) => `https://next.bgm.tv/p1/users/${username}`),
  );
});

test('friend routes reject malformed usernames before calling upstream', async () => {
  let upstreamCalls = 0;
  const app = createAuthedApp(async () => {
    upstreamCalls += 1;
    return Response.json({});
  });

  for (const [method, path] of [
    ['GET', '/me/users/%E4%B8%8D%E5%90%88%E6%B3%95'],
    ['GET', '/me/users/a%20b'],
    ['GET', '/me/users/sai.'],
    ['GET', '/me/users/sai@bgm'],
    ['GET', '/me/users/' + 'x'.repeat(33)],
    ['PUT', '/me/friends/' + 'x'.repeat(33)],
    ['DELETE', '/me/friends/user.name'],
    ['PUT', '/me/blocklist/user.name'],
  ]) {
    const response = await app.request(
      path,
      { headers: authHeaders, method },
      env,
    );
    assert.equal(response.status, 400, path);
    assert.deepEqual(await response.json(), {
      error: 'invalid_username',
      message: '用户名格式不正确。',
    });
  }

  assert.equal(upstreamCalls, 0);
});

test('adding and removing friends forward PUT and DELETE to the P1 endpoint', async () => {
  const requests = [];
  const app = createAuthedApp(async (input, init) => {
    requests.push({ method: init.method, url: String(input) });
    return Response.json({});
  });

  const added = await app.request(
    '/me/friends/sai',
    { headers: authHeaders, method: 'PUT' },
    env,
  );
  assert.equal(added.status, 200);
  assert.deepEqual(await added.json(), { isFriend: true });

  const removed = await app.request(
    '/me/friends/sai',
    { headers: authHeaders, method: 'DELETE' },
    env,
  );
  assert.equal(removed.status, 200);
  assert.deepEqual(await removed.json(), { isFriend: false });

  assert.deepEqual(requests, [
    { method: 'PUT', url: 'https://next.bgm.tv/p1/friends/sai' },
    { method: 'DELETE', url: 'https://next.bgm.tv/p1/friends/sai' },
  ]);
});

test('friend routes surface upstream 404, 429, and 5xx distinctly', async () => {
  for (const [status, expectedStatus, message] of [
    [404, 404, '没有找到这个用户。'],
    [429, 429, '操作太频繁了，请稍后再试。'],
    [500, 503, 'Bangumi 暂时不可用，请稍后重试。'],
    [400, 502, '好友操作没有完成，请稍后重试。'],
  ]) {
    const app = createAuthedApp(async () => new Response(null, { status }));
    const response = await app.request(
      '/me/users/sai',
      { headers: authHeaders },
      env,
    );
    assert.equal(response.status, expectedStatus, `upstream ${status}`);
    assert.deepEqual(await response.json(), {
      error: 'bangumi_friends_unavailable',
      message,
    });
  }
});

test('friend routes clear the credential on upstream 401 and ask for re-login', async () => {
  const state = { credentialDeleted: false };
  const app = createAuthedApp(
    async () => new Response(null, { status: 401 }),
    state,
  );

  const response = await app.request(
    '/me/friends/sai',
    { headers: authHeaders, method: 'PUT' },
    env,
  );

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    error: 'bangumi_reauthorization_required',
    message: 'Bangumi 授权已失效，请重新登录。',
  });
  assert.equal(state.credentialDeleted, true);
});

test('friend routes require a session', async () => {
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

  const response = await app.request('/me/blocklist', { headers: authHeaders }, env);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: 'session_expired',
    message: '登录已过期，请刷新或重新登录。',
  });
});

test('blocklist read and write routes forward to the private blocklist endpoint', async () => {
  const requests = [];
  const app = createAuthedApp(async (input, init) => {
    requests.push({ method: init?.method ?? 'GET', url: String(input) });
    return Response.json({ blocklist: [7, 9] });
  });

  const read = await app.request('/me/blocklist', { headers: authHeaders }, env);
  assert.equal(read.status, 200);
  assert.deepEqual(await read.json(), { blocklist: [7, 9] });

  const blocked = await app.request(
    '/me/blocklist/sai',
    { headers: authHeaders, method: 'PUT' },
    env,
  );
  assert.equal(blocked.status, 200);
  assert.deepEqual(await blocked.json(), { blocklist: [7, 9] });

  const unblocked = await app.request(
    '/me/blocklist/sai',
    { headers: authHeaders, method: 'DELETE' },
    env,
  );
  assert.equal(unblocked.status, 200);
  assert.deepEqual(await unblocked.json(), { blocklist: [7, 9] });

  assert.deepEqual(requests, [
    { method: 'GET', url: 'https://next.bgm.tv/p1/blocklist' },
    { method: 'PUT', url: 'https://next.bgm.tv/p1/blocklist/sai' },
    { method: 'DELETE', url: 'https://next.bgm.tv/p1/blocklist/sai' },
  ]);
});

test('blocklist read maps upstream failures with a distinct error code', async () => {
  for (const [status, expectedStatus] of [
    [500, 503],
    [400, 502],
  ]) {
    const app = createAuthedApp(async () => new Response(null, { status }));
    const response = await app.request(
      '/me/blocklist',
      { headers: authHeaders },
      env,
    );
    assert.equal(response.status, expectedStatus, `upstream ${status}`);
    const body = await response.json();
    assert.equal(body.error, 'bangumi_blocklist_unavailable');
  }
});

test('blocklist write uses the shared friend error mapping including 404', async () => {
  const app = createAuthedApp(async () => new Response(null, { status: 404 }));
  const response = await app.request(
    '/me/blocklist/ghost',
    { headers: authHeaders, method: 'PUT' },
    env,
  );

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: 'bangumi_friends_unavailable',
    message: '没有找到这个用户。',
  });
});
