import assert from 'node:assert/strict';
import test from 'node:test';

import { getBangumiNotifications } from '../src/notifications/bangumi-client.ts';

test('Bangumi notifications map private API types into Kaku models', async () => {
  const fetcher = async (input, init) => {
    assert.equal(String(input), 'https://next.bgm.tv/p1/notify?limit=30');
    assert.equal(init.headers.Authorization, 'Bearer access-token');

    return Response.json({
      data: [
        {
          createdAt: 1_785_940_000,
          id: 42,
          mainID: 22447,
          relatedID: 99,
          sender: {
            avatar: { small: 'https://lain.bgm.tv/avatar.jpg' },
            nickname: '好友 A',
            username: 'friend-a',
          },
          title: '9.2 达成，现在应该稳了',
          type: 8,
          unread: true,
        },
      ],
      total: 1,
    });
  };

  const result = await getBangumiNotifications({
    accessToken: 'access-token',
    fetcher,
  });

  assert.deepEqual(result, {
    items: [
      {
        action: '回复了你在条目讨论中的发言',
        createdAt: 1_785_940_000,
        id: 42,
        sender: {
          avatarUrl: 'https://lain.bgm.tv/avatar.jpg',
          nickname: '好友 A',
          username: 'friend-a',
        },
        target: { id: 22447, kind: 'subject-topic' },
        title: '9.2 达成，现在应该稳了',
        unread: true,
      },
    ],
    total: 1,
    unreadCount: 1,
  });
});

test('friend notifications link to the sender profile', async () => {
  const fetcher = async () =>
    Response.json({
      data: [
        {
          createdAt: 1_785_940_000,
          id: 43,
          mainID: 0,
          relatedID: 0,
          sender: {
            avatar: { small: '' },
            nickname: '好友 B',
            username: 'friend-b',
          },
          title: '',
          type: 15,
          unread: false,
        },
      ],
      total: 1,
    });

  const result = await getBangumiNotifications({
    accessToken: 'access-token',
    fetcher,
  });

  assert.deepEqual(result.items[0]?.target, {
    kind: 'user',
    username: 'friend-b',
  });
  assert.equal(result.items[0]?.sender.avatarUrl, undefined);
  assert.equal(result.items[0]?.title, '');
  assert.equal(result.unreadCount, 0);
});
