import assert from 'node:assert/strict';
import test from 'node:test';

import { getBrowseSubjects } from '../src/infrastructure/kaku/browse-client.ts';
import { KakuApiError } from '../src/infrastructure/kaku/auth-client.ts';

const subject = {
  coverUrl: 'https://lain.bgm.tv/pic/cover/l/1.jpg',
  id: 425,
  score: 8.9,
  title: '葬送的芙莉莲',
  type: 2,
};

function stubFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ init, url: String(url) });
    return handler();
  };
  return calls;
}

test('getBrowseSubjects builds the query with sort, type, year and tag', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const calls = stubFetch(() =>
    Response.json({ items: [subject], nextPage: 3, totalPages: 10 }),
  );

  const page = await getBrowseSubjects({
    page: 2,
    sort: 'rank',
    subjectType: 2,
    tag: '科幻',
    year: 2024,
  });

  const url = new URL(calls[0].url);
  assert.equal(url.pathname, '/public/browse');
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(url.searchParams.get('sort'), 'rank');
  assert.equal(url.searchParams.get('type'), '2');
  assert.equal(url.searchParams.get('year'), '2024');
  assert.equal(url.searchParams.get('tag'), '科幻');
  assert.deepEqual(page, { items: [subject], nextPage: 3, totalPages: 10 });
});

test('getBrowseSubjects omits year and tag when not given', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const calls = stubFetch(() => Response.json({ items: [], totalPages: 0 }));

  await getBrowseSubjects({ page: 1, sort: 'collects', subjectType: 1 });

  const url = new URL(calls[0].url);
  assert.equal(url.search, '?page=1&sort=collects&type=1');
});

test('getBrowseSubjects throws KakuApiError with the server message', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  stubFetch(
    () =>
      new Response(JSON.stringify({ message: '浏览服务不可用' }), { status: 502 }),
  );

  await assert.rejects(
    () => getBrowseSubjects({ page: 1, sort: 'date', subjectType: 1 }),
    (error) => {
      assert.ok(error instanceof KakuApiError);
      assert.equal(error.status, 502);
      assert.equal(error.message, '浏览服务不可用');
      return true;
    },
  );
});

test('getBrowseSubjects forwards the abort signal', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  let receivedSignal;
  globalThis.fetch = async (_url, init) => {
    receivedSignal = init.signal;
    return Response.json({ items: [], totalPages: 0 });
  };
  const controller = new AbortController();

  await getBrowseSubjects({
    page: 1,
    signal: controller.signal,
    sort: 'trends',
    subjectType: 1,
  });

  assert.equal(receivedSignal, controller.signal);
});
