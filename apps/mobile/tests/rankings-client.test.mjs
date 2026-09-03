import assert from 'node:assert/strict';
import test from 'node:test';

import { getPublicRankedSubjects } from '../src/infrastructure/kaku/rankings-client.ts';
import { KakuApiError } from '../src/infrastructure/kaku/auth-client.ts';

const ranked = {
  coverUrl: 'https://lain.bgm.tv/pic/cover/l/1.jpg',
  date: '2024-10-05',
  id: 425,
  score: 9.1,
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

test('getPublicRankedSubjects requests the offset page and parses items', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const calls = stubFetch(() =>
    Response.json({ items: [ranked], nextOffset: 24, total: 480 }),
  );

  const page = await getPublicRankedSubjects(2, 24);

  assert.equal(calls.length, 1);
  const url = new URL(calls[0].url);
  assert.equal(url.pathname, '/public/rankings');
  assert.equal(url.searchParams.get('offset'), '24');
  assert.equal(url.searchParams.get('type'), '2');
  assert.deepEqual(page, { items: [ranked], nextOffset: 24, total: 480 });
});

test('getPublicRankedSubjects throws KakuApiError with the server message', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  stubFetch(
    () =>
      new Response(JSON.stringify({ message: '排行榜不可用' }), { status: 500 }),
  );

  await assert.rejects(
    () => getPublicRankedSubjects(1, 0),
    (error) => {
      assert.ok(error instanceof KakuApiError);
      assert.equal(error.status, 500);
      assert.equal(error.message, '排行榜不可用');
      return true;
    },
  );
});

test('getPublicRankedSubjects forwards the abort signal', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  let receivedSignal;
  globalThis.fetch = async (_url, init) => {
    receivedSignal = init.signal;
    return Response.json({ items: [] });
  };
  const controller = new AbortController();

  await getPublicRankedSubjects(1, 0, controller.signal);

  assert.equal(receivedSignal, controller.signal);
});
