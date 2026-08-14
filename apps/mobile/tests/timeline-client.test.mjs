import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createTimelineSay,
  getFriendTimeline,
} from '../src/infrastructure/kaku/timeline-client.ts';

const item = {
  createdAt: 1_785_940_000,
  id: 77,
  leadingText: '将 ',
  replies: 0,
  text: '将 蓝与火 加为了好友',
  trailingText: ' 加为了好友',
  user: {
    avatarUrl: 'https://lain.bgm.tv/a.jpg',
    nickname: '魂',
    username: 'soul',
  },
  userMentions: [{ nickname: '蓝与火', username: 'blue-fire' }],
};

test('getFriendTimeline requests the paging path and parses the response', async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return Response.json({ items: [item], nextUntil: 99 });
  };

  const page = await getFriendTimeline(request, 42);

  assert.deepEqual(calls, [
    { path: '/me/timeline?until=42', init: { signal: undefined } },
  ]);
  assert.equal(page.items.length, 1);
  assert.equal(page.items[0].userMentions[0].username, 'blue-fire');
  assert.equal(page.nextUntil, 99);
});

test('getFriendTimeline sends the abort signal through', async () => {
  let receivedSignal;
  const request = async (_path, init) => {
    receivedSignal = init.signal;
    return Response.json({ items: [] });
  };
  const controller = new AbortController();

  await getFriendTimeline(request, undefined, controller.signal);

  assert.equal(receivedSignal, controller.signal);
});

test('createTimelineSay posts the content and turnstile token', async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return Response.json({ id: 123 });
  };

  const result = await createTimelineSay(request, 'hello', 'turnstile-token');

  assert.deepEqual(calls, [
    {
      path: '/me/timeline',
      init: {
        body: JSON.stringify({
          content: 'hello',
          turnstileToken: 'turnstile-token',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
    },
  ]);
  assert.deepEqual(result, { id: 123 });
});
