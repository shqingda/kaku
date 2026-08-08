import assert from 'node:assert/strict';
import test from 'node:test';

import { createApp } from '../src/app.ts';

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
      'https://api.bgm.tv/v0/subjects?limit=30&offset=30&sort=rank&type=2',
    );
    assert.equal(init.cf.cacheEverything, true);
    assert.equal(init.cf.cacheTtl, 1800);

    return Response.json({
      data: [
        {
          date: '2024-01-01',
          id: 400602,
          images: { common: 'http://lain.bgm.tv/cover.jpg' },
          name: '葬送のフリーレン',
          name_cn: '葬送的芙莉莲',
          rating: { score: 8.9 },
          summary: '这个大字段不应该发给移动端。',
          type: 2,
        },
      ],
      limit: 30,
      offset: 30,
      total: 100,
    });
  };

  const app = createApp({ fetcher, rankingCache });
  const response = await app.request(
    '/public/rankings?type=2&offset=30',
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
        date: '2024-01-01',
        id: 400602,
        score: 8.9,
        title: '葬送的芙莉莲',
        type: 2,
      },
    ],
    nextOffset: 31,
    total: 100,
  });

  const cachedResponse = await app.request(
    '/public/rankings?type=2&offset=30',
  );
  assert.equal(cachedResponse.status, 200);
  assert.equal(cachedResponse.headers.get('X-Kaku-Cache'), 'HIT');
  assert.equal(upstreamCalls, 1);
  assert.equal((await cachedResponse.json()).items[0].id, 400602);
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
