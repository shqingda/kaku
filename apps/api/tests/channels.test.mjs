import assert from 'node:assert/strict';
import test from 'node:test';

import { getBangumiChannelSubjects } from '../src/channels/bangumi-client.ts';

test('channel subjects map monthly attention data into Kaku models', async () => {
  const fetcher = async (input) => {
    assert.equal(
      String(input),
      'https://next.bgm.tv/p1/trending/subjects?type=2&limit=12',
    );
    return Response.json({
      data: [
        {
          count: 6941,
          subject: {
            id: 622206,
            images: { common: 'http://lain.bgm.tv/cover.jpg' },
            name: 'ヤニねこ',
            nameCN: '尼古喵喵',
            rating: { score: 7.17 },
            type: 2,
          },
        },
      ],
      total: 1000,
    });
  };

  assert.deepEqual(
    await getBangumiChannelSubjects({ fetcher, subjectType: 2 }),
    {
      items: [
        {
          attentionCount: 6941,
          coverUrl: 'https://lain.bgm.tv/cover.jpg',
          id: 622206,
          score: 7.17,
          title: '尼古喵喵',
          type: 2,
        },
      ],
    },
  );
});

test('channel subjects fall back to ranked data when trending is unavailable', async () => {
  const fetcher = async (input) => {
    const url = String(input);
    if (url.includes('/p1/trending/subjects')) {
      return new Response(null, { status: 503 });
    }
    if (url.includes('/p1/subjects')) {
      return new Response(null, { status: 503 });
    }

    return Response.json({
      data: [
        {
          date: '2026-07-02',
          id: 622206,
          images: { common: 'https://lain.bgm.tv/cover.jpg' },
          name: 'ヤニねこ',
          name_cn: '尼古喵喵',
          rating: { score: 7.17 },
          type: 2,
        },
      ],
      limit: 24,
      offset: 0,
      total: 1,
    });
  };

  const channel = await getBangumiChannelSubjects({ fetcher, subjectType: 2 });
  assert.equal(channel.items[0]?.title, '尼古喵喵');
  assert.equal(channel.items[0]?.attentionCount, undefined);
});
