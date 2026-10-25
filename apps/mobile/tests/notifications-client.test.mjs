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

test('getNotifications preserves omitted optional fields and strips unknown wire fields', async () => {
  const targets = [
    { id: 4, kind: 'group-topic', replyId: 20 },
    { id: 5, kind: 'subject-topic' },
    { kind: 'user', username: '' },
    undefined,
  ];
  const items = targets.map((target, index) => ({
    action: '', createdAt: 0, id: index + 1,
    sender: { nickname: '', username: '' },
    ...(target ? { target } : {}), title: '', unread: false,
  }));
  const response = { items, total: 4, unreadCount: 0 };
  const parsed = await getNotifications(async () => Response.json({
    ...response, extra: 'ignored',
    items: items.map(item => ({ ...item, extra: 'ignored', sender: { ...item.sender, extra: 'ignored' } })),
  }));

  assert.deepEqual(parsed, response);
  assert.equal('target' in parsed.items[3], false);
  assert.equal('avatarUrl' in parsed.items[0].sender, false);
});

test('getNotifications retains required fields, optional null rejection and numeric validation', async () => {
  const item = { action: '回复', createdAt: 1, id: 1, sender, title: '', unread: false };
  const list = { items: [item], total: 1, unreadCount: 0 };
  const malformed = [
    { ...list, total: undefined },
    { ...list, unreadCount: -1 },
    { ...list, items: [{ ...item, id: 0 }] },
    { ...list, items: [{ ...item, createdAt: 1.5 }] },
    { ...list, items: [{ ...item, target: null }] },
    { ...list, items: [{ ...item, target: { kind: 'blog', id: 1, replyId: null } }] },
    { ...list, items: [{ ...item, sender: { ...sender, avatarUrl: null } }] },
    { ...list, items: [{ ...item, sender: { ...sender, avatarUrl: 'not-a-url' } }] },
  ];
  for (const [index, payload] of malformed.entries()) {
    await assert.rejects(() => getNotifications(async () => Response.json(payload)), { name: 'ZodError' }, `case ${index}`);
  }
});
