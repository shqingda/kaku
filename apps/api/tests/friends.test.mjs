import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BangumiFriendsError,
  getBangumiUserFriendship,
  setBangumiFriend,
} from '../src/friends/bangumi-client.ts';

const accessToken = 'bangumi-access-token';

test('friendship read hits the private user profile with OAuth headers', async () => {
  const fetcher = async (input, init) => {
    assert.equal(String(input), 'https://next.bgm.tv/p1/users/friend-a');
    assert.equal(init.headers.Authorization, 'Bearer bangumi-access-token');
    assert.ok(init.headers['User-Agent']);

    return Response.json({ isFriend: true });
  };

  const result = await getBangumiUserFriendship({
    accessToken,
    fetcher,
    username: 'friend-a',
  });

  assert.deepEqual(result, { isFriend: true });
});

test('friendship read treats a missing flag as not friends', async () => {
  const result = await getBangumiUserFriendship({
    accessToken,
    fetcher: async () => Response.json({}),
    username: 'friend-a',
  });

  assert.deepEqual(result, { isFriend: false });
});

test('adding a friend forwards PUT to the private friend endpoint', async () => {
  const fetcher = async (input, init) => {
    assert.equal(String(input), 'https://next.bgm.tv/p1/friends/friend-a');
    assert.equal(init.method, 'PUT');
    assert.equal(init.headers.Authorization, 'Bearer bangumi-access-token');

    return new Response('{}', { status: 200 });
  };

  const result = await setBangumiFriend({
    accessToken,
    fetcher,
    shouldAdd: true,
    username: 'friend-a',
  });

  assert.equal(result, true);
});

test('removing a friend forwards DELETE and reports the new state', async () => {
  const fetcher = async (input, init) => {
    assert.equal(String(input), 'https://next.bgm.tv/p1/friends/friend-a');
    assert.equal(init.method, 'DELETE');

    return new Response('{}', { status: 200 });
  };

  const result = await setBangumiFriend({
    accessToken,
    fetcher,
    shouldAdd: false,
    username: 'friend-a',
  });

  assert.equal(result, false);
});

test('rate limiting surfaces a clear retry message', async () => {
  const fetcher = async () => new Response('{}', { status: 429 });

  await assert.rejects(
    () =>
      setBangumiFriend({
        accessToken,
        fetcher,
        shouldAdd: true,
        username: 'friend-a',
      }),
    (error) => {
      assert.ok(error instanceof BangumiFriendsError);
      assert.equal(error.status, 429);
      assert.equal(error.message, '操作太频繁了，请稍后再试。');
      return true;
    },
  );
});

test('missing users map to a not-found error', async () => {
  const fetcher = async () => new Response('{}', { status: 404 });

  await assert.rejects(
    () =>
      getBangumiUserFriendship({
        accessToken,
        fetcher,
        username: 'ghost',
      }),
    (error) => {
      assert.ok(error instanceof BangumiFriendsError);
      assert.equal(error.status, 404);
      assert.equal(error.message, '没有找到这个用户。');
      return true;
    },
  );
});
