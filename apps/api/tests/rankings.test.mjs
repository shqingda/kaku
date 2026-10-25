import assert from 'node:assert/strict';
import test from 'node:test';

import { createTestApp as createApp } from './helpers/app.mjs';

test('public rankings return a small provider-neutral page', async () => {
  const storedResponses = new Map();
  const rankingCache = {
    async match(request) {
      return storedResponses.get(request.url)?.clone();
    },
    async put(request, response) {
      storedResponses.set(request.url, response.clone());
    },
  };
  let upstreamCalls = 0;
  const fetcher = async (input, init) => {
    upstreamCalls += 1;
    assert.equal(
      String(input),
      'https://next.bgm.tv/p1/subjects?type=2&sort=rank&page=2',
    );
    assert.equal(init.cf.cacheEverything, true);
    assert.equal(init.cf.cacheTtl, 1800);

    return Response.json({
      data: [
        {
          id: 400602,
          images: { common: 'http://lain.bgm.tv/cover.jpg' },
          name: '葬送のフリーレン',
          nameCN: '葬送的芙莉莲',
          rating: { score: 8.9 },
          info: '这个大字段不应该发给移动端。',
          type: 2,
        },
      ],
      total: 5,
    });
  };

  const app = createApp({ fetcher, rankingCache });
  const response = await app.request(
    '/public/rankings?type=2&offset=24',
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-Kaku-Cache'), 'MISS');
  assert.equal(
    response.headers.get('Cache-Control'),
    'public, max-age=300, stale-while-revalidate=1800',
  );
  assert.deepEqual(await response.json(), {
    items: [
      {
        coverUrl: 'https://lain.bgm.tv/cover.jpg',
        id: 400602,
        score: 8.9,
        title: '葬送的芙莉莲',
        type: 2,
      },
    ],
    nextOffset: 48,
  });

  const cachedResponse = await app.request(
    '/public/rankings?offset=24&ignored=not-part-of-the-key&type=2',
  );
  assert.equal(cachedResponse.status, 200);
  assert.equal(cachedResponse.headers.get('X-Kaku-Cache'), 'HIT');
  assert.equal(upstreamCalls, 1);
  assert.equal((await cachedResponse.json()).items[0].id, 400602);
});

test('public rankings fall back to v0 when P1 is unavailable', async () => {
  const requestedUrls = [];
  const fetcher = async (input) => {
    requestedUrls.push(String(input));
    if (requestedUrls.length === 1) {
      return new Response(null, { status: 503 });
    }

    return Response.json({
      data: [
        {
          date: '2024-01-01',
          id: 400602,
          images: { common: 'http://lain.bgm.tv/cover.jpg' },
          name: '葬送のフリーレン',
          name_cn: '葬送的芙莉莲',
          rating: { score: 8.9 },
          type: 2,
        },
      ],
      offset: 0,
      total: 100,
    });
  };

  const response = await createApp({ fetcher }).request(
    '/public/rankings?type=2&offset=0',
  );

  assert.equal(response.status, 200);
  assert.deepEqual(requestedUrls, [
    'https://next.bgm.tv/p1/subjects?type=2&sort=rank&page=1',
    'https://api.bgm.tv/v0/subjects?limit=24&offset=0&sort=rank&type=2',
  ]);
  assert.deepEqual(await response.json(), {
    items: [
      {
        coverUrl: 'https://lain.bgm.tv/cover.jpg',
        date: '2024-01-01',
        id: 400602,
        score: 8.9,
        title: '葬送的芙莉莲',
        type: 2,
      },
    ],
    nextOffset: 1,
    total: 100,
  });
});

test('public rankings reject unsupported types without calling Bangumi', async () => {
  let called = false;
  const response = await createApp({
    fetcher: async () => {
      called = true;
      return Response.json({});
    },
  }).request('/public/rankings?type=5&offset=0');

  assert.equal(response.status, 400);
  assert.equal(called, false);
  assert.deepEqual(await response.json(), {
    error: 'invalid_ranking_query',
    message: '排行榜类型或分页位置无效。',
  });
});

for (const operation of ['match', 'put']) {
  test(`public rankings survive a cache ${operation} failure`, async (t) => {
    t.mock.method(console, 'warn', () => {});
    t.mock.method(console, 'error', () => {});
    const rankingCache = { async match() {}, async put() {} };
    rankingCache[operation] = async () => { throw new Error('cache unavailable'); };
    const response = await createApp({
      rankingCache,
      fetcher: async () => Response.json({ data: [], total: 0 }),
    }).request('/public/rankings?type=2&offset=0');

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('X-Kaku-Cache'), 'MISS');
    assert.deepEqual(await response.json(), { items: [] });
  });
}

test('public rankings keep upstream failure status and headers when cache reads fail', async (t) => {
  t.mock.method(console, 'warn', () => {});
  const response = await createApp({
    rankingCache: {
      async match() { throw new Error('cache unavailable'); },
      async put() { assert.fail('upstream failures must not be cached'); },
    },
    fetcher: async () => new Response(null, { status: 503 }),
  }).request('/public/rankings?type=2&offset=0');

  assert.equal(response.status, 503);
  assert.equal(response.headers.get('X-Kaku-Cache'), null);
  assert.equal(response.headers.get('Cache-Control'), null);
  assert.equal((await response.json()).error, 'bangumi_ranking_unavailable');
});
