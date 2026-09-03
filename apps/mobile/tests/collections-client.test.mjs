import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getPersonalCollection,
  savePersonalCollection,
} from '../src/infrastructure/kaku/collections-client.ts';
import { KakuApiError } from '../src/infrastructure/kaku/auth-client.ts';

const collection = {
  collectionStatus: 'doing',
  comment: '补旧番中',
  isPrivate: false,
  rating: 8,
  subjectId: 12,
  tags: ['科幻'],
  watchedEpisodeNumbers: [1, 2, 3],
};

test('getPersonalCollection parses the stored collection', async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return Response.json({ collection });
  };

  const result = await getPersonalCollection(request, 12);

  assert.deepEqual(calls, [
    { path: '/me/collections/12', init: { signal: undefined } },
  ]);
  assert.deepEqual(result, collection);
});

test('getPersonalCollection returns null when nothing is collected', async () => {
  const request = async () => Response.json({ collection: null });

  assert.equal(await getPersonalCollection(request, 404), null);
});

test('getPersonalCollection throws KakuApiError with the server message', async () => {
  const request = async () =>
    new Response(JSON.stringify({ message: '登录已过期' }), { status: 401 });

  await assert.rejects(
    () => getPersonalCollection(request, 12),
    (error) => {
      assert.ok(error instanceof KakuApiError);
      assert.equal(error.status, 401);
      assert.equal(error.message, '登录已过期');
      return true;
    },
  );
});

test('getPersonalCollection forwards the abort signal', async () => {
  let receivedSignal;
  const request = async (_path, init) => {
    receivedSignal = init.signal;
    return Response.json({ collection: null });
  };
  const controller = new AbortController();

  await getPersonalCollection(request, 12, controller.signal);

  assert.equal(receivedSignal, controller.signal);
});

test('savePersonalCollection puts the update payload', async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return Response.json({ collection });
  };
  const update = {
    collectionStatus: 'doing',
    comment: '补旧番中',
    watchedEpisodeNumbers: [1, 2, 3],
  };

  const result = await savePersonalCollection(request, 12, update);

  assert.deepEqual(calls, [
    {
      path: '/me/collections/12',
      init: {
        body: JSON.stringify(update),
        headers: { 'Content-Type': 'application/json' },
        method: 'PUT',
      },
    },
  ]);
  assert.deepEqual(result, collection);
});

test('savePersonalCollection throws KakuApiError on failure', async () => {
  const request = async () =>
    new Response(JSON.stringify({ message: '条目不存在' }), { status: 404 });

  await assert.rejects(() => savePersonalCollection(request, 12, {}), {
    name: 'KakuApiError',
    status: 404,
    message: '条目不存在',
  });
});
