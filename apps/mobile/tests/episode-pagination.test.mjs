import assert from 'node:assert/strict';
import test from 'node:test';

import { getBangumiEpisodes } from '../src/infrastructure/bangumi/api-v0/client.ts';

const flushRequests = () => new Promise(resolve => setImmediate(resolve));

function episodePage(total, offset) {
  return {
    data: Array.from({ length: Math.min(100, total - offset) }, (_, index) => ({
      comment: 0, desc: '', ep: offset + index + 1, id: offset + index + 1,
      name: `Episode ${offset + index + 1}`, name_cn: '',
    })),
    limit: 100, offset, total,
  };
}

function requestControlledPages(t, { total = 701, signal, deferFirst = false } = {}) {
  const originalFetch = globalThis.fetch;
  const started = [];
  const pending = new Map();
  let active = 0;
  let peakActive = 0;
  let finishing = false;
  globalThis.fetch = async (url, options) => {
    const parsed = new URL(url);
    assert.equal(parsed.pathname, '/v0/episodes');
    assert.equal(parsed.searchParams.get('subject_id'), '42');
    assert.equal(parsed.searchParams.get('limit'), '100');
    assert.equal(parsed.searchParams.get('type'), '0');
    const offset = Number(parsed.searchParams.get('offset'));
    started.push(offset);
    active += 1;
    peakActive = Math.max(peakActive, active);
    try {
      if (finishing || (offset === 0 && !deferFirst)) {
        return Response.json(episodePage(total, offset));
      }
      // A response can finish just as cancellation arrives; retain it for that race.
      return await new Promise(resolve => {
        pending.set(offset, { resolve, signal: options.signal });
      });
    } finally {
      active -= 1;
    }
  };
  const request = getBangumiEpisodes(42, signal);
  void request.catch(() => {});
  t.after(async () => {
    finishing = true;
    for (const [offset, entry] of pending) entry.resolve(Response.json(episodePage(total, offset)));
    await request.catch(() => {});
    await flushRequests();
    globalThis.fetch = originalFetch;
  });
  return {
    request, started, pending,
    get peakActive() { return peakActive; },
    release(offset, response = Response.json(episodePage(total, offset))) {
      assert.ok(pending.has(offset), `page ${offset} must have started`);
      pending.get(offset).resolve(response);
      pending.delete(offset);
    },
  };
}

test('episode pages use at most three requests, refill free slots and retain every episode in page order', async t => {
  const pages = requestControlledPages(t);
  await flushRequests();
  assert.deepEqual(pages.started, [0, 100, 200, 300]);

  for (const [completed, next] of [[300, 400], [100, 500], [400, 600], [200, 700]]) {
    pages.release(completed);
    await flushRequests();
    assert.equal(pages.started.at(-1), next);
  }
  pages.release(700);
  pages.release(600);
  pages.release(500);

  const episodes = await pages.request;
  assert.equal(pages.peakActive, 3);
  assert.deepEqual(episodes, Array.from({ length: 701 }, (_, index) => episodePage(701, index).data[0]));
});

test('an already cancelled episode query does not start its first page', async t => {
  const controller = new AbortController();
  controller.abort();
  const pages = requestControlledPages(t, { total: 1, signal: controller.signal });
  await assert.rejects(pages.request, { name: 'AbortError' });
  assert.deepEqual(pages.started, []);
});

for (const total of [1, 701]) {
  test(`cancellation while the first page completes rejects without starting more pages (${total} episodes)`, async t => {
    const controller = new AbortController();
    const pages = requestControlledPages(t, { total, signal: controller.signal, deferFirst: true });
    controller.abort();
    pages.release(0);
    await flushRequests();
    assert.deepEqual(pages.started, [0]);
    await assert.rejects(pages.request, { name: 'AbortError' });
  });
}

test('cancellation reaches active requests and prevents a late response from starting more pages', async t => {
  const controller = new AbortController();
  const pages = requestControlledPages(t, { signal: controller.signal });
  await flushRequests();
  controller.abort();
  assert.ok([...pages.pending.values()].every(entry => entry.signal.aborted));
  pages.release(100);
  await flushRequests();
  assert.deepEqual(pages.started, [0, 100, 200, 300]);
  await assert.rejects(pages.request, { name: 'AbortError' });
});

test('cancellation as the last page completes still rejects the episode query', async t => {
  const controller = new AbortController();
  const pages = requestControlledPages(t, { total: 101, signal: controller.signal });
  await flushRequests();
  controller.abort();
  pages.release(100);
  await assert.rejects(pages.request, { name: 'AbortError' });
  assert.deepEqual(pages.started, [0, 100]);
});

for (const [failure, response, expectedError] of [
  ['HTTP', () => new Response('unavailable', { status: 503 }), { name: 'BangumiRequestError', message: 'Bangumi API 请求失败（503）', status: 503 }],
  ['schema', () => Response.json({ data: [] }), { name: 'ZodError' }],
]) {
  test(`a page ${failure} failure rejects without returning partial chapters or scheduling more pages`, async t => {
    const pages = requestControlledPages(t);
    await flushRequests();
    pages.release(200, response());
    await assert.rejects(pages.request, expectedError);
    pages.release(100);
    pages.release(300);
    await flushRequests();
    assert.deepEqual(pages.started, [0, 100, 200, 300]);
  });
}

test('a single episode page is returned without requesting extra pages', async t => {
  const pages = requestControlledPages(t, { total: 12 });
  assert.deepEqual(await pages.request, episodePage(12, 0).data);
  assert.deepEqual(pages.started, [0]);
});
