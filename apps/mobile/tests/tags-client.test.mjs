import assert from 'node:assert/strict';
import test from 'node:test';

import { getGlobalTags } from '../src/infrastructure/kaku/tags-client.ts';
import { KakuApiError } from '../src/infrastructure/kaku/auth-client.ts';

function stubFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ init, url: String(url) });
    return handler();
  };
  return calls;
}

test('getGlobalTags requests the tagged page and parses items', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const calls = stubFetch(() =>
    Response.json({
      items: [
        { count: 4200, name: '科幻' },
        { count: 1800, name: '日常' },
      ],
      nextPage: 2,
      page: 1,
      totalPages: 5,
    }),
  );

  const page = await getGlobalTags(2, 1);

  assert.equal(calls.length, 1);
  const url = new URL(calls[0].url);
  assert.equal(url.pathname, '/public/tags');
  assert.equal(url.searchParams.get('page'), '1');
  assert.equal(url.searchParams.get('schema'), '1');
  assert.equal(url.searchParams.get('type'), '2');
  assert.deepEqual(page.items, [
    { count: 4200, name: '科幻' },
    { count: 1800, name: '日常' },
  ]);
  assert.equal(page.nextPage, 2);
  assert.equal(page.totalPages, 5);
});

test('getGlobalTags throws KakuApiError with the server message', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  stubFetch(
    () => new Response(JSON.stringify({ message: '标签服务不可用' }), { status: 500 }),
  );

  await assert.rejects(
    () => getGlobalTags(1, 1),
    (error) => {
      assert.ok(error instanceof KakuApiError);
      assert.equal(error.status, 500);
      assert.equal(error.message, '标签服务不可用');
      return true;
    },
  );
});

test('getGlobalTags forwards the abort signal', async (t) => {
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

  await getGlobalTags(1, 1, controller.signal);

  assert.equal(receivedSignal, controller.signal);
});
