import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getBangumiPersonalCollection,
  saveBangumiPersonalCollection,
} from '../src/collections/bangumi-client.ts';

const accessToken = 'bangumi-access-token';

function episodePage() {
  return {
    data: [
      { episode: { ep: 1, id: 101, type: 0 }, type: 2 },
      { episode: { ep: 2, id: 102, type: 0 }, type: 0 },
      { episode: { ep: 3, id: 103, type: 0 }, type: 2 },
      { episode: { ep: 1, id: 201, type: 1 }, type: 2 },
    ],
    total: 4,
  };
}

test('Bangumi collection maps status, rating, and main-story progress', async () => {
  const fetcher = async (input) => {
    const url = String(input);

    if (url.includes('/users/kaku-user/collections/42')) {
      return Response.json({
        comment: '值得慢慢看',
        private: true,
        ep_status: 5,
        rate: 9,
        subject_id: 42,
        subject_type: 2,
        tags: ['公路片', '奇幻'],
        type: 3,
        vol_status: 1,
      });
    }

    if (url.includes('/users/-/collections/42/episodes')) {
      return Response.json(episodePage());
    }

    throw new Error(`Unexpected request: ${url}`);
  };

  const collection = await getBangumiPersonalCollection({
    accessToken,
    fetcher,
    subjectId: 42,
    username: 'kaku-user',
  });

  assert.deepEqual(collection, {
    collectionStatus: 'doing',
    comment: '值得慢慢看',
    isPrivate: true,
    rating: 9,
    subjectId: 42,
    tags: ['公路片', '奇幻'],
    watchedEpisodeNumbers: [1, 3],
  });
});

test('Bangumi collection treats a null comment as an empty note', async () => {
  const collection = await getBangumiPersonalCollection({
    accessToken,
    fetcher: async () =>
      Response.json({
        comment: null,
        private: null,
        ep_status: null,
        rate: 0,
        subject_id: 43,
        subject_type: 1,
        tags: null,
        type: 1,
        vol_status: null,
      }),
    subjectId: 43,
    username: 'kaku-user',
  });

  assert.deepEqual(collection, {
    collectionStatus: 'wish',
    comment: '',
    isPrivate: false,
    readChapterCount: 0,
    readVolumeCount: 0,
    subjectId: 43,
    tags: [],
    watchedEpisodeNumbers: [],
  });
});

test('saving progress updates only changed Bangumi episode states', async () => {
  const requests = [];
  const fetcher = async (input, init = {}) => {
    const url = String(input);
    requests.push({ body: init.body, method: init.method ?? 'GET', url });

    if (init.method === 'POST') {
      return new Response(null, { status: 204 });
    }

    if (init.method === 'PATCH') {
      return new Response(null, { status: 204 });
    }

    return Response.json(episodePage());
  };

  await saveBangumiPersonalCollection({
    accessToken,
    collectionStatus: 'doing',
    comment: '保留一点观后感',
    fetcher,
    isPrivate: true,
    rating: 8,
    subjectId: 42,
    tags: ['重温', '演出'],
    watchedEpisodeNumbers: [1, 2],
  });

  assert.deepEqual(JSON.parse(requests[0].body), {
    comment: '保留一点观后感',
    private: true,
    rate: 8,
    tags: ['重温', '演出'],
    type: 3,
  });
  const patches = requests
    .filter((request) => request.method === 'PATCH')
    .map((request) => JSON.parse(request.body));
  assert.deepEqual(patches, [
    { episode_id: [102], type: 2 },
    { episode_id: [103], type: 0 },
  ]);
});

test('saving book progress maps chapters and volumes', async () => {
  let body;

  await saveBangumiPersonalCollection({
    accessToken,
    collectionStatus: 'doing',
    fetcher: async (_input, init = {}) => {
      body = JSON.parse(init.body);
      return new Response(null, { status: 204 });
    },
    readChapterCount: 126,
    readVolumeCount: 14,
    subjectId: 44,
  });

  assert.deepEqual(body, {
    ep_status: 126,
    rate: 0,
    type: 3,
    vol_status: 14,
  });
});
