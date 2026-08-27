import assert from 'node:assert/strict';
import test from 'node:test';

import { createApp } from '../src/app.ts';
import { pickExactTitleMatch } from '../src/enrichment/match.ts';

const bangumiSubject = {
  id: 12,
  name: 'CLANNAD',
  name_cn: 'CLANNAD',
  type: 2,
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}

test('pickExactTitleMatch accepts equal titles and rejects near misses', () => {
  const subject = { originalTitle: 'CLANNAD', title: 'CLANNAD' };
  assert.equal(
    pickExactTitleMatch(subject, [{ native: 'CLANNAD' }])?.native,
    'CLANNAD',
  );
  assert.equal(
    pickExactTitleMatch(subject, [{ native: 'CLANNAD After Story' }]),
    undefined,
  );
});

test('GET /public/subjects/:id/enrichment returns unmatched when titles differ', async () => {
  const app = createApp({
    fetcher: async (url) => {
      if (String(url).includes('bgm.tv')) {
        return jsonResponse(bangumiSubject);
      }
      return jsonResponse({
        data: {
          Media: {
            averageScore: 88,
            id: 1,
            siteUrl: 'https://anilist.co/anime/1',
            title: {
              english: 'After Story',
              native: 'CLANNAD After Story',
              romaji: 'CLANNAD After Story',
              userPreferred: 'CLANNAD After Story',
            },
            trailer: null,
          },
        },
      });
    },
  });

  const response = await app.request('/public/subjects/12/enrichment');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    enrichment: { matched: false, provider: 'anilist' },
  });
});

test('GET /public/subjects/:id/enrichment returns AniList extras on an exact title', async () => {
  const app = createApp({
    fetcher: async (url) => {
      if (String(url).includes('bgm.tv')) {
        return jsonResponse(bangumiSubject);
      }
      return jsonResponse({
        data: {
          Media: {
            averageScore: 88,
            id: 2167,
            siteUrl: 'https://anilist.co/anime/2167',
            title: {
              english: 'CLANNAD',
              native: 'CLANNAD',
              romaji: 'CLANNAD',
              userPreferred: 'CLANNAD',
            },
            trailer: { id: 'abc', site: 'youtube' },
          },
        },
      });
    },
  });

  const response = await app.request('/public/subjects/12/enrichment');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    enrichment: {
      matched: true,
      provider: 'anilist',
      score: 88,
      title: 'CLANNAD',
      trailerUrl: 'https://www.youtube.com/watch?v=abc',
      url: 'https://anilist.co/anime/2167',
    },
  });
});

test('GET /public/subjects/:id/enrichment surfaces AniList failures', async () => {
  const app = createApp({
    fetcher: async (url) => {
      if (String(url).includes('bgm.tv')) {
        return jsonResponse(bangumiSubject);
      }
      return jsonResponse({ errors: [{ message: 'rate limited' }] }, 429);
    },
  });

  const response = await app.request('/public/subjects/12/enrichment');
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: 'anilist_unavailable',
    message: 'AniList 暂时没有响应。',
  });
});

test('GET /public/subjects/:id/enrichment rejects a bad id', async () => {
  const response = await createApp().request('/public/subjects/nope/enrichment');
  assert.equal(response.status, 400);
});
