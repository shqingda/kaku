import assert from 'node:assert/strict';
import test from 'node:test';

import { getGlobalBlogs } from '../src/infrastructure/kaku/blogs-client.ts';
import { KakuApiError } from '../src/infrastructure/kaku/auth-client.ts';

const KAKU_API_URL = 'https://kaku-api.shqingda.workers.dev';

const blog = {
  author: '魂',
  authorUsername: 'soul',
  id: 42,
  replyCount: 2,
  summary: '第一话观感极佳',
  title: '蓝与火 第一话',
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

test('getGlobalBlogs requests the filtered page and parses items', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const calls = stubFetch(() => Response.json({ items: [blog], page: 2 }));

  const page = await getGlobalBlogs('anime', 2);

  assert.equal(calls.length, 1);
  const url = new URL(calls[0].url);
  assert.equal(url.origin, KAKU_API_URL);
  assert.equal(url.pathname, '/public/blogs');
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(url.searchParams.get('type'), 'anime');
  assert.deepEqual(page, { items: [blog], page: 2 });
});

test('getGlobalBlogs throws KakuApiError with the server message', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  stubFetch(
    () => new Response(JSON.stringify({ message: '博客服务不可用' }), { status: 503 }),
  );

  await assert.rejects(
    () => getGlobalBlogs('all', 1),
    (error) => {
      assert.ok(error instanceof KakuApiError);
      assert.equal(error.status, 503);
      assert.equal(error.message, '博客服务不可用');
      return true;
    },
  );
});

test('getGlobalBlogs forwards the abort signal', async (t) => {
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

  await getGlobalBlogs('book', 1, controller.signal);

  assert.equal(receivedSignal, controller.signal);
});
