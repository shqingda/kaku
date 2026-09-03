import assert from 'node:assert/strict';
import test from 'node:test';

import { getChannelSubjects } from '../src/infrastructure/kaku/channels-client.ts';
import { KakuApiError } from '../src/infrastructure/kaku/auth-client.ts';

const channelSubject = {
  attentionCount: 1200,
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

test('getChannelSubjects requests the channel type and parses items', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const calls = stubFetch(() =>
    Response.json({ items: [channelSubject] }),
  );

  const list = await getChannelSubjects(2);

  assert.equal(calls.length, 1);
  const url = new URL(calls[0].url);
  assert.equal(url.pathname, '/public/channels');
  assert.equal(url.search, '?type=2');
  assert.deepEqual(list, { items: [channelSubject] });
});

test('getChannelSubjects throws KakuApiError with the server message', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  stubFetch(
    () =>
      new Response(JSON.stringify({ message: '频道服务不可用' }), { status: 500 }),
  );

  await assert.rejects(
    () => getChannelSubjects(1),
    (error) => {
      assert.ok(error instanceof KakuApiError);
      assert.equal(error.status, 500);
      assert.equal(error.message, '频道服务不可用');
      return true;
    },
  );
});

test('getChannelSubjects forwards the abort signal', async (t) => {
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

  await getChannelSubjects(1, controller.signal);

  assert.equal(receivedSignal, controller.signal);
});
