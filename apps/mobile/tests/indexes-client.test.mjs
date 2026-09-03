import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createIndex,
  deleteIndex,
  getGlobalIndexes,
  getIndexCollection,
  setIndexCollection,
  updateIndex,
} from '../src/infrastructure/kaku/indexes-client.ts';
import { KakuApiError } from '../src/infrastructure/kaku/auth-client.ts';

const indexSummary = {
  author: '魂',
  authorUsername: 'soul',
  description: '十年必看的科幻动画',
  id: 9,
  itemCount: 12,
  title: '科幻补番清单',
  updatedAt: 1_785_940_000,
};

function stubFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ init, url: String(url) });
    return handler();
  };
  return calls;
}

test('getGlobalIndexes requests the sorted page and parses items', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const calls = stubFetch(() =>
    Response.json({ items: [indexSummary], nextPage: 2, page: 1, totalPages: 3 }),
  );

  const page = await getGlobalIndexes('popular', 1);

  const url = new URL(calls[0].url);
  assert.equal(url.pathname, '/public/indexes');
  assert.equal(url.searchParams.get('page'), '1');
  assert.equal(url.searchParams.get('sort'), 'popular');
  assert.deepEqual(page.items, [indexSummary]);
  assert.equal(page.nextPage, 2);
});

test('getGlobalIndexes throws KakuApiError with the server message', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  stubFetch(
    () => new Response(JSON.stringify({ message: '清单服务不可用' }), { status: 503 }),
  );

  await assert.rejects(
    () => getGlobalIndexes('latest', 1),
    (error) => {
      assert.ok(error instanceof KakuApiError);
      assert.equal(error.status, 503);
      assert.equal(error.message, '清单服务不可用');
      return true;
    },
  );
});

test('getGlobalIndexes forwards the abort signal', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  let receivedSignal;
  globalThis.fetch = async (_url, init) => {
    receivedSignal = init.signal;
    return Response.json({ items: [], page: 1 });
  };
  const controller = new AbortController();

  await getGlobalIndexes('latest', 1, controller.signal);

  assert.equal(receivedSignal, controller.signal);
});

test('createIndex posts the index input and returns the id', async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return Response.json({ id: 77 });
  };
  const input = { desc: '只收录完结番', isPrivate: false, title: '科幻补番清单' };

  const result = await createIndex(request, input);

  assert.deepEqual(calls, [
    {
      path: '/me/indexes',
      init: {
        body: JSON.stringify(input),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
    },
  ]);
  assert.deepEqual(result, { id: 77 });
});

test('updateIndex patches the index', async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return new Response(null, { status: 200 });
  };
  const input = { desc: '更新描述', title: '新标题' };

  await updateIndex(request, 77, input);

  assert.deepEqual(calls, [
    {
      path: '/me/indexes/77',
      init: {
        body: JSON.stringify(input),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      },
    },
  ]);
});

test('deleteIndex sends DELETE', async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return new Response(null, { status: 204 });
  };

  await deleteIndex(request, 77);

  assert.deepEqual(calls, [
    { path: '/me/indexes/77', init: { method: 'DELETE' } },
  ]);
});

test('index mutations throw KakuApiError with the server message', async () => {
  const request = async () =>
    new Response(JSON.stringify({ message: '没有权限' }), { status: 403 });

  await assert.rejects(() => createIndex(request, { desc: '', title: 'x' }), {
    name: 'KakuApiError',
    status: 403,
    message: '没有权限',
  });
  await assert.rejects(() => updateIndex(request, 77, {}), {
    name: 'KakuApiError',
    status: 403,
  });
  await assert.rejects(() => deleteIndex(request, 77), {
    name: 'KakuApiError',
    status: 403,
  });
});

test('getIndexCollection reads the collected flag and forwards the signal', async () => {
  let receivedSignal;
  const request = async (path, init) => {
    receivedSignal = init.signal;
    return Response.json({ collected: true });
  };
  const controller = new AbortController();

  const collected = await getIndexCollection(request, 77, controller.signal);

  assert.equal(receivedSignal, controller.signal);
  assert.equal(collected, true);
});

test('setIndexCollection posts to collect and deletes to remove', async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return Response.json({ collected: true });
  };

  const collected = await setIndexCollection(request, 77, true);

  assert.deepEqual(calls, [
    { path: '/me/indexes/77/collect', init: { method: 'POST' } },
  ]);
  assert.equal(collected, true);

  await setIndexCollection(request, 77, false);

  assert.deepEqual(calls[1], {
    path: '/me/indexes/77/collect',
    init: { method: 'DELETE' },
  });
});

test('setIndexCollection throws KakuApiError on failure', async () => {
  const request = async () =>
    new Response(JSON.stringify({ message: '登录已过期' }), { status: 401 });

  await assert.rejects(() => setIndexCollection(request, 77, true), {
    name: 'KakuApiError',
    status: 401,
    message: '登录已过期',
  });
});
