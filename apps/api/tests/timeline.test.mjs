import assert from 'node:assert/strict';
import test from 'node:test';

import { getBangumiFriendTimeline } from '../src/timeline/bangumi-client.ts';

test('Bangumi friend timeline maps private API data into Kaku models', async () => {
  const fetcher = async (_input, init) => {
    assert.equal(init.headers.Authorization, 'Bearer access-token');

    return Response.json([
      {
        batch: false,
        cat: 5,
        createdAt: 1_785_940_000,
        id: 42,
        memo: { status: { tsukkomi: '今天也要看动画。' } },
        replies: 2,
        source: { name: 'web' },
        type: 1,
        uid: 7,
        user: {
          avatar: { small: 'https://lain.bgm.tv/avatar.jpg' },
          nickname: 'Kaku 用户',
          username: 'kaku-user',
        },
      },
    ]);
  };

  const items = await getBangumiFriendTimeline({
    accessToken: 'access-token',
    fetcher,
  });

  assert.deepEqual(items, [
    {
      createdAt: 1_785_940_000,
      id: 42,
      replies: 2,
      subjectId: undefined,
      text: '今天也要看动画。',
      user: {
        avatarUrl: 'https://lain.bgm.tv/avatar.jpg',
        nickname: 'Kaku 用户',
        username: 'kaku-user',
      },
    },
  ]);
});
