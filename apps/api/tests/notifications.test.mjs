import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getBangumiNotifications,
  markBangumiNotificationsRead,
} from '../src/notifications/bangumi-client.ts';

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
          type: 4,
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
        target: { id: 22447, kind: 'subject-topic', replyId: 99 },
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

test('notification actions cover the full Bangumi type range', async () => {
  const types = [1, 3, 5, 7, 9, 11, 13, 16, 22, 28, 50, 99];
  const fetcher = async () =>
    Response.json({
      data: types.map((type, index) => ({
        createdAt: 1_785_940_000,
        id: 100 + index,
        mainID: 0,
        relatedID: 0,
        sender: { avatar: {}, nickname: 's', username: 'sender' },
        title: '',
        type,
        unread: false,
      })),
      total: types.length,
    });

  const result = await getBangumiNotifications({
    accessToken: 'access-token',
    fetcher,
  });

  const actions = result.items.map((item) => item.action);
  assert.equal(actions[0], '回复了你的小组话题');
  assert.equal(actions[1], '回复了你的条目讨论');
  assert.equal(actions[2], '回复了你的角色讨论');
  assert.equal(actions[3], '回复了你的日志');
  assert.equal(actions[4], '回复了你的章节讨论');
  assert.equal(actions[5], '在目录中给你留言了');
  assert.equal(actions[6], '在人物讨论中回复了你');
  assert.equal(actions[7], '向你发送了一条通知');
  assert.equal(actions[8], '回复了你的吐槽');
  assert.equal(actions[9], '在吐槽中提到了你');
  assert.equal(actions[10], '回复了你的人物修订');
  assert.equal(actions[11], '向你发送了一条通知');
});

test('character, person and blog notifications map to their targets', async () => {
  const cases = [
    { type: 5, expected: { id: 881, kind: 'character', replyId: 12 } },
    { type: 6, expected: { id: 882, kind: 'character', replyId: 13 } },
    { type: 25, expected: { id: 883, kind: 'character', replyId: undefined } },
    { type: 13, expected: { id: 113, kind: 'person', replyId: 14 } },
    { type: 26, expected: { id: 114, kind: 'person', replyId: undefined } },
    { type: 7, expected: { id: 771, kind: 'blog', replyId: 15 } },
    { type: 8, expected: { id: 772, kind: 'blog', replyId: 16 } },
    { type: 29, expected: { id: 773, kind: 'blog', replyId: undefined } },
  ];

  const fetcher = async () =>
    Response.json({
      data: cases.map(({ expected, type }, index) => ({
        createdAt: 1_785_940_000,
        id: 200 + index,
        mainID: expected.id,
        relatedID: expected.replyId ?? 0,
        sender: { avatar: {}, nickname: 's', username: 'sender' },
        title: '',
        type,
        unread: false,
      })),
      total: cases.length,
    });

  const result = await getBangumiNotifications({
    accessToken: 'access-token',
    fetcher,
  });

  const targets = result.items.map((item) => item.target);
  assert.deepEqual(targets, cases.map(({ expected }) => expected));
});

test('marking notifications read forwards selected ids without exposing OAuth', async () => {
  const fetcher = async (input, init) => {
    assert.equal(String(input), 'https://next.bgm.tv/p1/clear-notify');
    assert.equal(init.headers.Authorization, 'Bearer access-token');
    assert.equal(init.method, 'POST');
    assert.deepEqual(JSON.parse(init.body), { id: [42, 43] });
    return Response.json({});
  };

  await markBangumiNotificationsRead({
    accessToken: 'access-token',
    fetcher,
    ids: [42, 43],
  });
});

test('marking all notifications read sends an empty object', async () => {
  const fetcher = async (_input, init) => {
    assert.deepEqual(JSON.parse(init.body), {});
    return Response.json({});
  };

  await markBangumiNotificationsRead({
    accessToken: 'access-token',
    fetcher,
  });
});
