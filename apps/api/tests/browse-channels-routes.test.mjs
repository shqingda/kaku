import assert from 'node:assert/strict';
import test from 'node:test';

import { createApp } from '../src/app.ts';

function browseFetcher(responses = {}) {
  return async (input, init) => {
    const url = String(input);
    const key = init?.method === 'POST' ? 'v0-search' : url;
    const response = responses[key] ?? responses.default;
    if (!response) {
      throw new Error(`Unexpected request: ${url}`);
    }
    return response;
  };
}

const p1Subject = {
  id: 400602,
  images: { common: 'http://lain.bgm.tv/cover.jpg' },
  name: '葬送のフリーレン',
  nameCN: '葬送的芙莉莲',
  rating: { score: 8.9 },
  type: 2,
};

test('public browse maps a P1 page and marks the cache status', async () => {
  const requestedUrls = [];
  const fetcher = async (input) => {
    requestedUrls.push(String(input));
    return Response.json({ data: [p1Subject], total: 5 });
  };

  const app = createApp({ fetcher });
  const response = await app.request(
    '/public/browse?type=2&sort=trends&page=2&year=2026',
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
        coverUrl: 'http://lain.bgm.tv/cover.jpg',
        id: 400602,
        score: 8.9,
        title: '葬送的芙莉莲',
        type: 2,
      },
    ],
    nextPage: 3,
    totalPages: 5,
  });
  assert.equal(
    requestedUrls[0],
    'https://next.bgm.tv/p1/subjects?type=2&sort=trends&page=2&year=2026',
  );
});

test('public browse falls back to the v0 tag search when P1 has no tagged rows', async () => {
  const fetcher = async (input, init) => {
    if (init?.method === 'POST') {
      assert.equal(String(input), 'https://api.bgm.tv/v0/search/subjects?limit=20&offset=0');
      return Response.json({
        data: [
          {
            id: 622206,
            images: { medium: 'https://lain.bgm.tv/m.jpg' },
            name: 'ヤニねこ',
            name_cn: '尼古喵喵',
            rating: { score: 7.17 },
            type: 2,
          },
        ],
        limit: 20,
        offset: 0,
        total: 1,
      });
    }

    return Response.json({ data: [], total: 0 });
  };

  const app = createApp({ fetcher });
  const response = await app.request(
    '/public/browse?type=2&sort=rank&page=1&tag=TV&tag=%E6%BC%AB%E7%94%BB%E6%94%B9',
  );

  assert.equal(response.status, 200);
  const tagSearchBody = await response.json();
  assert.deepEqual(tagSearchBody.items, [
    {
      coverUrl: 'https://lain.bgm.tv/m.jpg',
      id: 622206,
      score: 7.17,
      title: '尼古喵喵',
      type: 2,
    },
  ]);
  assert.equal(tagSearchBody.nextPage, undefined);
  assert.equal(tagSearchBody.totalPages, 1);
});

test('public browse rejects invalid filters without calling upstream', async () => {
  let upstreamCalls = 0;
  const fetcher = async () => {
    upstreamCalls += 1;
    return Response.json({ data: [], total: 0 });
  };
  const app = createApp({ fetcher });

  for (const query of [
    'type=5',
    'type=2&sort=hot',
    'type=2&page=0',
    'type=2&page=10001',
    'type=2&year=1899',
    'type=2&year=2101',
    'type=2&tag=a&tag=b&tag=c&tag=d&tag=e&tag=f',
    `type=2&tag=${'长'.repeat(31)}`,
  ]) {
    const response = await app.request(`/public/browse?${query}`);
    assert.equal(response.status, 400, query);
    assert.deepEqual(await response.json(), {
      error: 'invalid_browse_query',
      message: '分类筛选条件无效。',
    });
  }

  assert.equal(upstreamCalls, 0);
});

test('public browse maps upstream failures to 503 and 502', async () => {
  const unavailable = createApp({
    fetcher: browseFetcher({ default: new Response(null, { status: 503 }) }),
  });
  const unavailableResponse = await unavailable.request('/public/browse?type=1');
  assert.equal(unavailableResponse.status, 503);
  assert.deepEqual(await unavailableResponse.json(), {
    error: 'bangumi_browse_unavailable',
    message: 'Bangumi 分类浏览暂时不可用。',
  });

  const rejected = createApp({
    fetcher: browseFetcher({ default: new Response(null, { status: 404 }) }),
  });
  const rejectedResponse = await rejected.request('/public/browse?type=1');
  assert.equal(rejectedResponse.status, 502);
  assert.deepEqual(await rejectedResponse.json(), {
    error: 'bangumi_browse_unavailable',
    message: 'Bangumi 无法返回这组筛选结果。',
  });
});

test('public channels map the trending list onto the Kaku model', async () => {
  const requestedUrls = [];
  const fetcher = async (input) => {
    requestedUrls.push(String(input));
    return Response.json({
      data: [
        {
          count: 1280,
          subject: {
            id: 426417,
            images: { common: 'http://lain.bgm.tv/c.jpg' },
            name: 'ぼっち・ざ・ろっく!',
            nameCN: '',
            rating: { score: 9.1 },
            type: 2,
          },
        },
        {
          count: 300,
          subject: {
            id: 1,
            images: {},
            name: '无图条目',
            nameCN: '无图条目',
            type: 1,
          },
        },
      ],
    });
  };

  const app = createApp({ fetcher });
  const response = await app.request('/public/channels?type=2');

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-Kaku-Cache'), 'MISS');
  assert.equal(
    response.headers.get('Cache-Control'),
    'public, max-age=300, stale-while-revalidate=1800',
  );
  assert.deepEqual(await response.json(), {
    items: [
      {
        attentionCount: 1280,
        coverUrl: 'https://lain.bgm.tv/c.jpg',
        id: 426417,
        score: 9.1,
        title: 'ぼっち・ざ・ろっく!',
        type: 2,
      },
      {
        attentionCount: 300,
        id: 1,
        title: '无图条目',
        type: 1,
      },
    ],
  });
  assert.equal(requestedUrls.length, 1);
});

test('public channels reject an unknown subject type', async () => {
  let upstreamCalls = 0;
  const app = createApp({
    fetcher: async () => {
      upstreamCalls += 1;
      return Response.json({ data: [] });
    },
  });

  const response = await app.request('/public/channels?type=99');
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: 'invalid_channel_type',
    message: '频道类型无效。',
  });
  assert.equal(upstreamCalls, 0);
});

test('public channels fall back to ranked subjects when trending is down', async () => {
  const fetcher = async (input) => {
    const url = String(input);
    if (url.includes('/p1/trending/subjects')) {
      return new Response(null, { status: 500 });
    }
    if (url.includes('next.bgm.tv/p1/subjects')) {
      return new Response(null, { status: 500 });
    }
    if (url.includes('api.bgm.tv/v0/subjects')) {
      return Response.json({
        data: [
          {
            date: '2023-09-08',
            id: 351986,
            images: { common: 'https://lain.bgm.tv/f.jpg' },
            name: '葬送のフリーレン',
            name_cn: '葬送的芙莉莲',
            rating: { score: 9.3 },
            type: 2,
          },
        ],
        offset: 0,
        total: 1,
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  const app = createApp({ fetcher });
  const response = await app.request('/public/channels?type=2');

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.items.length, 1);
  assert.equal(body.items[0].id, 351986);
  assert.equal(body.items[0].title, '葬送的芙莉莲');
});

test('public channels map a total upstream outage to 503 and soft failures to 502', async () => {
  const outage = createApp({
    fetcher: async () => new Response(null, { status: 502 }),
  });
  const outageResponse = await outage.request('/public/channels?type=2');
  assert.equal(outageResponse.status, 503);
  assert.deepEqual(await outageResponse.json(), {
    error: 'bangumi_channel_unavailable',
    message: 'Bangumi 排行榜服务暂时不可用，请稍后重试。',
  });

  const rejected = createApp({
    fetcher: async () => new Response(null, { status: 404 }),
  });
  const rejectedResponse = await rejected.request('/public/channels?type=2');
  assert.equal(rejectedResponse.status, 502);
  assert.deepEqual(await rejectedResponse.json(), {
    error: 'bangumi_channel_unavailable',
    message: 'Bangumi 暂时无法返回排行榜。',
  });
});
