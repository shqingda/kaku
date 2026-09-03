import assert from 'node:assert/strict';
import test from 'node:test';

import { getWikiRevisionFeed } from '../src/infrastructure/kaku/wiki-client.ts';
import { KakuApiError } from '../src/infrastructure/kaku/auth-client.ts';

const revision = {
  author: '魂',
  authorUsername: 'soul',
  editedAt: 1_785_940_000,
  note: '修正staff表',
  revisionUrl: 'https://bgm.tv/subject/425/edit/9',
  subjectId: 425,
  title: '葬送的芙莉莲',
};

function stubFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ init, url: String(url) });
    return handler();
  };
  return calls;
}

test('getWikiRevisionFeed requests the revision feed and parses items', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const calls = stubFetch(() => Response.json({ items: [revision] }));

  const feed = await getWikiRevisionFeed();

  assert.equal(calls.length, 1);
  const url = new URL(calls[0].url);
  assert.equal(url.origin, 'https://kaku-api.shqingda.workers.dev');
  assert.equal(url.pathname, '/public/wiki/revisions');
  assert.deepEqual(feed, { items: [revision] });
});

test('getWikiRevisionFeed throws KakuApiError with the server message', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  stubFetch(
    () => new Response(JSON.stringify({ message: 'wiki 不可用' }), { status: 500 }),
  );

  await assert.rejects(
    () => getWikiRevisionFeed(),
    (error) => {
      assert.ok(error instanceof KakuApiError);
      assert.equal(error.status, 500);
      assert.equal(error.message, 'wiki 不可用');
      return true;
    },
  );
});

test('getWikiRevisionFeed forwards the abort signal', async (t) => {
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

  await getWikiRevisionFeed(controller.signal);

  assert.equal(receivedSignal, controller.signal);
});
