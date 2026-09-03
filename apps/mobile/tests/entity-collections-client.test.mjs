import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getEntityCollection,
  saveEntityCollection,
} from '../src/infrastructure/kaku/entity-collections-client.ts';
import { KakuApiError } from '../src/infrastructure/kaku/auth-client.ts';

test('getEntityCollection reads the collected flag', async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return Response.json({ collected: true });
  };

  const collected = await getEntityCollection(request, 'character', 7);

  assert.deepEqual(calls, [
    {
      path: '/me/entities/character/7/collection',
      init: { signal: undefined },
    },
  ]);
  assert.equal(collected, true);
});

test('getEntityCollection returns false for uncollected entities', async () => {
  const request = async () => Response.json({ collected: false });

  assert.equal(await getEntityCollection(request, 'person', 3), false);
});

test('getEntityCollection forwards the abort signal', async () => {
  let receivedSignal;
  const request = async (_path, init) => {
    receivedSignal = init.signal;
    return Response.json({ collected: false });
  };
  const controller = new AbortController();

  await getEntityCollection(request, 'character', 7, controller.signal);

  assert.equal(receivedSignal, controller.signal);
});

test('saveEntityCollection puts the collected flag', async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return Response.json({ collected: true });
  };

  const collected = await saveEntityCollection(request, 'person', 9, true);

  assert.deepEqual(calls, [
    {
      path: '/me/entities/person/9/collection',
      init: {
        body: JSON.stringify({ collected: true }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PUT',
      },
    },
  ]);
  assert.equal(collected, true);
});

test('entity collection requests surface server errors', async () => {
  const request = async () =>
    new Response(JSON.stringify({ message: '人物不存在' }), { status: 404 });

  await assert.rejects(() => getEntityCollection(request, 'person', 9), {
    name: 'KakuApiError',
    status: 404,
    message: '人物不存在',
  });
  assert.ok(new KakuApiError('x', 500) instanceof Error);
  await assert.rejects(() => saveEntityCollection(request, 'person', 9, true), {
    name: 'KakuApiError',
    status: 404,
  });
});
