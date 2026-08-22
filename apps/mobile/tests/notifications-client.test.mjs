import assert from 'node:assert/strict';
import test from 'node:test';

import { getNotifications } from '../src/infrastructure/kaku/notifications-client.ts';

const sender = {
  avatarUrl: 'https://lain.bgm.tv/a.jpg',
  nickname: '魂',
  username: 'soul',
};

function notificationResponse(items) {
  return Response.json({ items, total: items.length, unreadCount: 0 });
}

test('getNotifications parses character, person and blog targets', async () => {
  const cases = [
    {
      kind: 'character',
      pathname: '/character/[id]',
      raw: { id: 1, kind: 'character', replyId: 12 },
    },
    {
      kind: 'person',
      pathname: '/person/[id]',
      raw: { id: 2, kind: 'person', replyId: 13 },
    },
    {
      kind: 'blog',
      pathname: '/blog/[id]',
      raw: { id: 3, kind: 'blog', replyId: 14 },
    },
  ];

  const request = async () =>
    notificationResponse(
      cases.map(({ kind, raw }, index) => ({
        action: '回复了你',
        createdAt: 1_785_940_000,
        id: 100 + index,
        sender,
        target: raw,
        title: `${kind} target`,
        unread: false,
      })),
    );

  const list = await getNotifications(request);

  assert.equal(list.items.length, 3);
  assert.deepEqual(list.items[0]?.target, cases[0]?.raw);
  assert.deepEqual(list.items[1]?.target, cases[1]?.raw);
  assert.deepEqual(list.items[2]?.target, cases[2]?.raw);
});

test('getNotifications rejects unknown target kinds', async () => {
  const request = async () =>
    notificationResponse([
      {
        action: '回复了你',
        createdAt: 1_785_940_000,
        id: 101,
        sender,
        target: { id: 9, kind: 'group', replyId: 1 },
        title: 'bad target',
        unread: false,
      },
    ]);

  await assert.rejects(() => getNotifications(request));
});

test('getNotifications forwards the abort signal', async () => {
  let receivedSignal;
  const request = async (_path, init) => {
    receivedSignal = init.signal;
    return notificationResponse([]);
  };
  const controller = new AbortController();

  await getNotifications(request, controller.signal);

  assert.equal(receivedSignal, controller.signal);
});