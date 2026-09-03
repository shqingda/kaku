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

function jsonRequest(path, { body, method = 'PUT' } = {}) {
  return {
    path,
    init: {
      body: JSON.stringify(body),
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      method,
    },
  };
}

// subject_type 1（书籍）不会触发章节进度分页拉取，适合作为路由层最小样例。
const storedBookCollection = {
  comment: '很好看',
  ep_status: 3,
  private: false,
  rate: 8,
  subject_id: 400,
  subject_type: 1,
  tags: ['小说'],
  type: 3,
  vol_status: 2,
};

test('GET /me/collections/:subjectId maps the stored book collection', async () => {
  const requests = [];
  const app = createAuthedApp(async (input, init) => {
    requests.push({
      authorization: init?.headers?.Authorization,
      url: String(input),
    });
    return Response.json(storedBookCollection);
  });

  const response = await app.request(
    '/me/collections/400',
    { headers: authHeaders },
    env,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    collection: {
      collectionStatus: 'doing',
      comment: '很好看',
      isPrivate: false,
      readChapterCount: 3,
      readVolumeCount: 2,
      rating: 8,
      subjectId: 400,
      tags: ['小说'],
      watchedEpisodeNumbers: [],
    },
  });
  assert.deepEqual(requests, [
    {
      authorization: 'Bearer bangumi-access-token',
      url: 'https://api.bgm.tv/v0/users/kaku/collections/400',
    },
  ]);
});

test('GET /me/collections/:subjectId for anime also loads watched episodes', async () => {
  const requests = [];
  const app = createAuthedApp(async (input) => {
    const url = String(input);
    requests.push(url);
    if (url.includes('/episodes')) {
      return Response.json({
        data: [
          { episode: { ep: 1, id: 101, type: 0 }, type: 2 },
          { episode: { ep: 2, id: 102, type: 0 }, type: 0 },
          { episode: { ep: 1, id: 201, type: 1 }, type: 2 },
        ],
        total: 3,
      });
    }

    return Response.json({
      comment: '',
      ep_status: 0,
      private: false,
      rate: 0,
      subject_id: 8,
      subject_type: 2,
      tags: [],
      type: 2,
      vol_status: 0,
    });
  });

  const response = await app.request(
    '/me/collections/8',
    { headers: authHeaders },
    env,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    collection: {
      collectionStatus: 'completed',
      comment: '',
      isPrivate: false,
      subjectId: 8,
      tags: [],
      watchedEpisodeNumbers: [1],
    },
  });
  assert.equal(
    requests[1],
    'https://api.bgm.tv/v0/users/-/collections/8/episodes?episode_type=0&limit=1000&offset=0',
  );
});

test('GET /me/collections/:subjectId returns a null collection when uncollected', async () => {
  const app = createAuthedApp(async () => new Response(null, { status: 404 }));

  const response = await app.request(
    '/me/collections/400',
    { headers: authHeaders },
    env,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { collection: null });
});

test('collection routes reject invalid subject ids before authenticating', async () => {
  let upstreamCalls = 0;
  const app = createAuthedApp(async () => {
    upstreamCalls += 1;
    return Response.json(storedBookCollection);
  });

  for (const subjectId of ['abc', '0', '-1', '1.5']) {
    const response = await app.request(
      `/me/collections/${subjectId}`,
      { headers: authHeaders },
      env,
    );
    assert.equal(response.status, 400, subjectId);
    assert.deepEqual(await response.json(), {
      error: 'invalid_subject_id',
      message: '条目 ID 不正确。',
    });
  }

  assert.equal(upstreamCalls, 0);
});

test('PUT /me/collections/:subjectId rejects invalid bodies before calling upstream', async () => {
  let upstreamCalls = 0;
  const app = createAuthedApp(async () => {
    upstreamCalls += 1;
    return Response.json(storedBookCollection);
  });

  const cases = [
    { rating: 11 },
    { rating: 0 },
    { collectionStatus: 'watching' },
    { comment: 'x'.repeat(1001) },
    { tags: ['has space'] },
    { tags: [''] },
    { readChapterCount: -1 },
    { readVolumeCount: 1.5 },
    { watchedEpisodeNumbers: [0] },
    { watchedEpisodeNumbers: Array.from({ length: 5001 }, (_, i) => i + 1) },
    { isPrivate: 'yes' },
  ];

  for (const body of cases) {
    const { path, init } = jsonRequest('/me/collections/400', { body });
    const response = await app.request(path, init, env);
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.deepEqual(await response.json(), {
      error: 'invalid_collection',
      message: '收藏内容格式不正确。',
    });
  }

  const notJson = await app.request(
    '/me/collections/400',
    {
      body: 'not json',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      method: 'PUT',
    },
    env,
  );
  assert.equal(notJson.status, 400);

  const badId = await app.request(
    '/me/collections/0',
    jsonRequest('/me/collections/0', {
      body: { collectionStatus: 'doing' },
    }).init,
    env,
  );
  assert.equal(badId.status, 400);
  assert.deepEqual(await badId.json(), {
    error: 'invalid_collection',
    message: '收藏内容格式不正确。',
  });

  assert.equal(upstreamCalls, 0);
});

test('PUT /me/collections/:subjectId refuses to uncollect because Bangumi has no API', async () => {
  let upstreamCalls = 0;
  const app = createAuthedApp(async () => {
    upstreamCalls += 1;
    return Response.json(storedBookCollection);
  });

  const response = await app.request(
    '/me/collections/400',
    jsonRequest('/me/collections/400', {
      body: { collectionStatus: null },
    }).init,
    env,
  );
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    error: 'collection_removal_unsupported',
    message: 'Bangumi 官方 API 暂不支持取消条目收藏。',
  });
  assert.equal(upstreamCalls, 0);
});

test('PUT /me/collections/:subjectId saves then reads back the collection', async () => {
  const requests = [];
  const app = createAuthedApp(async (input, init) => {
    requests.push({
      body: init.body,
      method: init.method ?? 'GET',
      url: String(input),
    });
    return Response.json(storedBookCollection);
  });

  const response = await app.request(
    '/me/collections/400',
    jsonRequest('/me/collections/400', {
      body: {
        collectionStatus: 'completed',
        comment: '补个评论',
        isPrivate: true,
        rating: 9,
        readChapterCount: 4,
        readVolumeCount: 1,
        tags: ['完结'],
      },
    }).init,
    env,
  );

  assert.equal(response.status, 200);
  assert.equal((await response.json()).collection.collectionStatus, 'doing');
  assert.deepEqual(
    requests.map((request) => ({
      body: request.body ? JSON.parse(request.body) : undefined,
      method: request.method,
      url: request.url,
    })),
    [
      {
        body: {
          comment: '补个评论',
          ep_status: 4,
          private: true,
          rate: 9,
          tags: ['完结'],
          type: 2,
          vol_status: 1,
        },
        method: 'POST',
        url: 'https://api.bgm.tv/v0/users/-/collections/400',
      },
      {
        body: undefined,
        method: 'GET',
        url: 'https://api.bgm.tv/v0/users/kaku/collections/400',
      },
    ],
  );
});

test('collection routes require a session and reject a missing Bangumi credential', async () => {
  const unauthenticated = createApp({
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

  const missingToken = await unauthenticated.request(
    '/me/collections/400',
    {},
    env,
  );
  assert.equal(missingToken.status, 401);
  assert.deepEqual(await missingToken.json(), {
    error: 'unauthorized',
    message: '请先登录 Kaku。',
  });

  const expiredSession = await unauthenticated.request(
    '/me/collections/400',
    { headers: authHeaders },
    env,
  );
  assert.equal(expiredSession.status, 401);
  assert.deepEqual(await expiredSession.json(), {
    error: 'session_expired',
    message: '登录已过期，请刷新或重新登录。',
  });

  const missingCredential = createAuthedApp(
    async () => {
      throw new Error('upstream must not be called');
    },
    { credentialDeleted: true },
  );
  const response = await missingCredential.request(
    '/me/collections/400',
    { headers: authHeaders },
    env,
  );
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    error: 'bangumi_reauthorization_required',
    message: 'Bangumi 授权已过期，请重新登录。',
  });
});

test('collection routes clear the credential on upstream 401', async () => {
  const state = { credentialDeleted: false };
  const app = createAuthedApp(
    async () => new Response(null, { status: 401 }),
    state,
  );

  const response = await app.request(
    '/me/collections/400',
    { headers: authHeaders },
    env,
  );

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    error: 'bangumi_reauthorization_required',
    message: 'Bangumi 授权已失效，请重新登录。',
  });
  assert.equal(state.credentialDeleted, true);
});

test('collection routes map upstream failures to 503 and 502', async () => {
  for (const [upstreamStatus, expectedStatus] of [
    [502, 503],
    [500, 503],
    [400, 502],
    [429, 502],
  ]) {
    const app = createAuthedApp(
      async () => new Response(null, { status: upstreamStatus }),
    );
    const response = await app.request(
      '/me/collections/400',
      { headers: authHeaders },
      env,
    );
    assert.equal(response.status, expectedStatus, `upstream ${upstreamStatus}`);
    const body = await response.json();
    assert.equal(body.error, 'bangumi_unavailable');
  }
});

test('entity collection read maps collected and uncollected states', async () => {
  const requests = [];
  const collectedApp = createAuthedApp(async (input) => {
    requests.push(String(input));
    return Response.json({});
  });
  const collected = await collectedApp.request(
    '/me/entities/character/9/collection',
    { headers: authHeaders },
    env,
  );
  assert.equal(collected.status, 200);
  assert.deepEqual(await collected.json(), { collected: true });
  assert.equal(
    requests[0],
    'https://api.bgm.tv/v0/users/kaku/collections/-/characters/9',
  );

  const missingApp = createAuthedApp(async () => new Response(null, { status: 404 }));
  const missing = await missingApp.request(
    '/me/entities/person/9/collection',
    { headers: authHeaders },
    env,
  );
  assert.equal(missing.status, 200);
  assert.deepEqual(await missing.json(), { collected: false });
});

test('entity collection routes validate kind, id, and body before calling upstream', async () => {
  let upstreamCalls = 0;
  const app = createAuthedApp(async () => {
    upstreamCalls += 1;
    return Response.json({});
  });

  for (const path of [
    '/me/entities/studio/9/collection',
    '/me/entities/character/0/collection',
    '/me/entities/person/abc/collection',
    '/me/entities/Character/9/collection',
  ]) {
    const response = await app.request(path, { headers: authHeaders }, env);
    assert.equal(response.status, 400, path);
    assert.deepEqual(await response.json(), {
      error: 'invalid_entity',
      message: '角色或人物编号不正确。',
    });
  }

  const badBody = await app.request(
    '/me/entities/character/9/collection',
    jsonRequest('/me/entities/character/9/collection', {
      body: { collected: 'yes' },
    }).init,
    env,
  );
  assert.equal(badBody.status, 400);
  assert.deepEqual(await badBody.json(), {
    error: 'invalid_entity_collection',
    message: '收藏状态不正确。',
  });

  const missingBody = await app.request(
    '/me/entities/character/9/collection',
    {
      body: 'not json',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      method: 'PUT',
    },
    env,
  );
  assert.equal(missingBody.status, 400);

  assert.equal(upstreamCalls, 0);
});

test('entity collection writes forward PUT or DELETE to the P1 endpoint', async () => {
  const requests = [];
  const app = createAuthedApp(async (input, init) => {
    requests.push({ method: init.method, url: String(input) });
    return Response.json({});
  });

  const collect = await app.request(
    '/me/entities/character/9/collection',
    jsonRequest('/me/entities/character/9/collection', {
      body: { collected: true },
    }).init,
    env,
  );
  assert.equal(collect.status, 200);
  assert.deepEqual(await collect.json(), { collected: true });

  const uncollect = await app.request(
    '/me/entities/person/13/collection',
    jsonRequest('/me/entities/person/13/collection', {
      body: { collected: false },
    }).init,
    env,
  );
  assert.equal(uncollect.status, 200);
  assert.deepEqual(await uncollect.json(), { collected: false });

  assert.deepEqual(requests, [
    { method: 'PUT', url: 'https://next.bgm.tv/p1/collections/characters/9' },
    { method: 'DELETE', url: 'https://next.bgm.tv/p1/collections/persons/13' },
  ]);
});

test('entity collection writes clear the credential on upstream 401', async () => {
  const state = { credentialDeleted: false };
  const app = createAuthedApp(
    async () => new Response(null, { status: 401 }),
    state,
  );

  const response = await app.request(
    '/me/entities/character/9/collection',
    jsonRequest('/me/entities/character/9/collection', {
      body: { collected: true },
    }).init,
    env,
  );

  assert.equal(response.status, 409);
  assert.equal(state.credentialDeleted, true);
});
