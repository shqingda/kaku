import assert from 'node:assert/strict';
import test from 'node:test';

import { getGlobalPeople } from '../src/infrastructure/kaku/people-browser-client.ts';
import { KakuApiError } from '../src/infrastructure/kaku/auth-client.ts';

const person = {
  categories: ['声优'],
  commentCount: 42,
  id: 7,
  imageUrl: 'https://lain.bgm.tv/pic/crt/l/1.jpg',
  kind: 'person',
  metadata: '日本 东京都',
  name: '种崎敦美',
};

function stubFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ init, url: String(url) });
    return handler();
  };
  return calls;
}

test('getGlobalPeople requests the page with kind, sort and schema', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const calls = stubFetch(() =>
    Response.json({ items: [person], nextPage: 2, page: 1, totalPages: 4 }),
  );

  const page = await getGlobalPeople('person', 'collects', undefined, undefined, 1);

  assert.equal(calls.length, 1);
  const url = new URL(calls[0].url);
  assert.equal(url.pathname, '/public/people');
  assert.equal(url.searchParams.get('kind'), 'person');
  assert.equal(url.searchParams.get('page'), '1');
  assert.equal(url.searchParams.get('schema'), '1');
  assert.equal(url.searchParams.get('sort'), 'collects');
  assert.equal(url.searchParams.has('type'), false);
  assert.equal(url.searchParams.has('gender'), false);
  assert.deepEqual(page.items, [person]);
  assert.equal(page.nextPage, 2);
  assert.equal(page.totalPages, 4);
});

test('getGlobalPeople adds type and gender filters when set', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const calls = stubFetch(() => Response.json({ items: [], page: 3 }));

  await getGlobalPeople('character', 'dateline', 2, 1, 3);

  const url = new URL(calls[0].url);
  assert.equal(url.searchParams.get('type'), '2');
  assert.equal(url.searchParams.get('gender'), '1');
});

test('getGlobalPeople throws KakuApiError with the server message', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  stubFetch(
    () => new Response(JSON.stringify({ message: '人物服务不可用' }), { status: 500 }),
  );

  await assert.rejects(
    () => getGlobalPeople('person', 'title', undefined, undefined, 1),
    (error) => {
      assert.ok(error instanceof KakuApiError);
      assert.equal(error.status, 500);
      assert.equal(error.message, '人物服务不可用');
      return true;
    },
  );
});

test('getGlobalPeople forwards the abort signal', async (t) => {
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

  await getGlobalPeople('person', 'comment', undefined, undefined, 1, controller.signal);

  assert.equal(receivedSignal, controller.signal);
});
