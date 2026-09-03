import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getBlocklist,
  getUserFriendship,
  setUserBlocked,
  setUserFriend,
} from '../src/infrastructure/kaku/friends-client.ts';
import { KakuApiError } from '../src/infrastructure/kaku/auth-client.ts';

test('getUserFriendship requests the encoded username path', async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return Response.json({ isFriend: true });
  };

  const isFriend = await getUserFriendship(request, 'soul tu');

  assert.deepEqual(calls, [
    {
      path: `/me/users/${encodeURIComponent('soul tu')}`,
      init: { signal: undefined },
    },
  ]);
  assert.equal(isFriend, true);
});

test('getUserFriendship throws KakuApiError with the server message', async () => {
  const request = async () =>
    new Response(JSON.stringify({ message: '用户不存在' }), { status: 404 });

  await assert.rejects(() => getUserFriendship(request, 'ghost'), (error) => {
    assert.ok(error instanceof KakuApiError);
    assert.equal(error.status, 404);
    assert.equal(error.message, '用户不存在');
    return true;
  });
});

test('getBlocklist returns the blocked ids', async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return Response.json({ blocklist: [3, 8] });
  };

  const blocklist = await getBlocklist(request);

  assert.deepEqual(calls, [
    { path: '/me/blocklist', init: { signal: undefined } },
  ]);
  assert.deepEqual(blocklist, [3, 8]);
});

test('getBlocklist defaults missing blocklist to an empty array', async () => {
  const request = async () => Response.json({});

  assert.deepEqual(await getBlocklist(request), []);
});

test('getBlocklist forwards the abort signal', async () => {
  let receivedSignal;
  const request = async (_path, init) => {
    receivedSignal = init.signal;
    return Response.json({ blocklist: [] });
  };
  const controller = new AbortController();

  await getBlocklist(request, controller.signal);

  assert.equal(receivedSignal, controller.signal);
});

test('setUserBlocked sends PUT to block and DELETE to unblock', async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return Response.json({ blocklist: [5] });
  };

  const blocklist = await setUserBlocked(request, 'spam-bot', true);

  assert.deepEqual(calls, [
    {
      path: '/me/blocklist/spam-bot',
      init: { method: 'PUT' },
    },
  ]);
  assert.deepEqual(blocklist, [5]);

  await setUserBlocked(request, 'spam-bot', false);

  assert.deepEqual(calls[1], {
    path: '/me/blocklist/spam-bot',
    init: { method: 'DELETE' },
  });
});

test('setUserBlocked throws KakuApiError on failure', async () => {
  const request = async () =>
    new Response('boom', { status: 503 });

  await assert.rejects(() => setUserBlocked(request, 'spam-bot', true), {
    name: 'KakuApiError',
    status: 503,
    message: 'Kaku 服务返回了 503',
  });
});

test('setUserFriend sends PUT with JSON headers and DELETE to remove', async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return Response.json({ isFriend: true });
  };

  const isFriend = await setUserFriend(request, 'blue-fire', true);

  assert.deepEqual(calls, [
    {
      path: '/me/friends/blue-fire',
      init: {
        headers: { 'Content-Type': 'application/json' },
        method: 'PUT',
      },
    },
  ]);
  assert.equal(isFriend, true);

  await setUserFriend(request, 'blue-fire', false);

  assert.deepEqual(calls[1], {
    path: '/me/friends/blue-fire',
    init: {
      headers: { 'Content-Type': 'application/json' },
      method: 'DELETE',
    },
  });
});

test('setUserFriend rejects non-friend failures', async () => {
  const request = async () =>
    new Response(JSON.stringify({ message: '不能添加自己' }), { status: 400 });

  await assert.rejects(() => setUserFriend(request, 'soul', true), {
    name: 'KakuApiError',
    status: 400,
    message: '不能添加自己',
  });
});
