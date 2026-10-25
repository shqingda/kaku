import assert from 'node:assert/strict';
import test from 'node:test';
import { setImmediate } from 'node:timers/promises';

import {
  getPublicCache,
  servePublicCached,
  withCacheStatus,
} from '../src/public-cache.ts';

function createMemoryCache() {
  const items = new Map();
  const putRequests = [];

  return {
    putRequests,
    async match(request) {
      return items.get(request.url);
    },
    async put(request, response) {
      putRequests.push(request);
      items.set(request.url, response.clone());
    },
  };
}

function createContext(url) {
  return { req: { url } };
}

const CONTEXT_URL = 'https://kaku.test/public/blogs?type=anime&page=2';

test('getPublicCache returns the injected cache untouched', () => {
  const cache = createMemoryCache();

  assert.equal(getPublicCache(cache), cache);
});

test('getPublicCache falls back to caches.default when available', async (t) => {
  const fallback = createMemoryCache();
  const previous = globalThis.caches;
  globalThis.caches = { default: fallback };
  t.after(() => {
    if (previous === undefined) delete globalThis.caches;
    else globalThis.caches = previous;
  });

  assert.equal(getPublicCache(), fallback);
});

test('getPublicCache stays undefined without injection or global caches', async (t) => {
  const hadGlobalCaches = 'caches' in globalThis;
  const previous = globalThis.caches;
  delete globalThis.caches;
  t.after(() => {
    if (hadGlobalCaches) globalThis.caches = previous;
  });

  assert.equal(getPublicCache(), undefined);
});

test('withCacheStatus tags the header while preserving the response', async () => {
  const original = new Response('payload', {
    status: 203,
    statusText: 'Partial something',
    headers: { 'Content-Type': 'text/plain' },
  });

  const tagged = withCacheStatus(original, 'HIT');

  assert.equal(tagged.status, 203);
  assert.equal(tagged.statusText, 'Partial something');
  assert.equal(tagged.headers.get('X-Kaku-Cache'), 'HIT');
  assert.equal(tagged.headers.get('Content-Type'), 'text/plain');
  assert.equal(await tagged.text(), 'payload');
  assert.equal(original.headers.get('X-Kaku-Cache'), null);
});

test('servePublicCached serves a cached copy with HIT without calling produce', async () => {
  const cache = createMemoryCache();
  await cache.put(
    new Request(CONTEXT_URL, { method: 'GET' }),
    Response.json(
      { cached: true },
      { headers: { 'Cache-Control': 'public, max-age=300' } },
    ),
  );
  let produceCalls = 0;

  const response = await servePublicCached(
    createContext(CONTEXT_URL),
    cache,
    async () => {
      produceCalls += 1;
      return Response.json({ fresh: true });
    },
  );

  assert.equal(produceCalls, 0);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-Kaku-Cache'), 'HIT');
  assert.equal(response.headers.get('Cache-Control'), 'public, max-age=300');
  assert.deepEqual(await response.json(), { cached: true });
});

test('servePublicCached fills the cache with a GET request key on MISS', async () => {
  const cache = createMemoryCache();

  const response = await servePublicCached(
    createContext(CONTEXT_URL),
    cache,
    async () => Response.json({ fresh: true }),
  );

  assert.equal(cache.putRequests.length, 1);
  const cacheKey = cache.putRequests[0];
  assert.equal(cacheKey.method, 'GET');
  assert.equal(cacheKey.url, CONTEXT_URL);
  assert.equal(response.headers.get('X-Kaku-Cache'), 'MISS');
  assert.deepEqual(await response.json(), { fresh: true });
});

test('servePublicCached does not cache error responses', async () => {
  const cache = createMemoryCache();

  const response = await servePublicCached(
    createContext(CONTEXT_URL),
    cache,
    async () => new Response('upstream exploded', { status: 503 }),
  );

  assert.deepEqual(cache.putRequests, []);
  assert.equal(response.status, 503);
  assert.equal(await response.text(), 'upstream exploded');
  assert.equal(response.headers.get('X-Kaku-Cache'), 'MISS');
});

test('servePublicCached passes through when no cache is available', async () => {
  const response = await servePublicCached(
    createContext(CONTEXT_URL),
    undefined,
    async () => Response.json({ fresh: true }),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-Kaku-Cache'), 'MISS');
  assert.deepEqual(await response.json(), { fresh: true });
});

for (const operation of ['match', 'put']) {
  test(`servePublicCached preserves upstream success when cache ${operation} fails`, async (t) => {
    const warnings = t.mock.method(console, 'warn', () => {});
    const cache = createMemoryCache();
    cache[operation] = async () => { throw new Error('secret upstream url and credentials'); };

    const response = await servePublicCached(createContext(CONTEXT_URL), cache, async () =>
      new Response('fresh payload', { status: 203, headers: { 'Cache-Control': 'public, max-age=300' } }));

    assert.equal(response.status, 203);
    assert.equal(response.headers.get('X-Kaku-Cache'), 'MISS');
    assert.equal(response.headers.get('Cache-Control'), 'public, max-age=300');
    assert.equal(await response.text(), 'fresh payload');
    assert.deepEqual(warnings.mock.calls.map(call => call.arguments), [
      [operation === 'match' ? 'public_cache_read_failed' : 'public_cache_write_failed'],
    ]);
  });
}

test('servePublicCached hands a slow write to waitUntil before returning its response', async () => {
  const gate = Promise.withResolvers();
  const tasks = [];
  const cache = createMemoryCache();
  const put = cache.put;
  cache.put = async (...args) => { await gate.promise; await put(...args); };
  const context = { ...createContext(CONTEXT_URL), executionCtx: { waitUntil(task) { tasks.push(task); } } };
  const pendingResponse = servePublicCached(context, cache, async () => Response.json({ fresh: true }));

  try {
    const result = await Promise.race([pendingResponse, setImmediate().then(() => 'still waiting for cache')]);
    assert.notEqual(result, 'still waiting for cache');
    assert.equal(tasks.length, 1);
    assert.equal(cache.putRequests.length, 0);
    assert.deepEqual(await result.json(), { fresh: true });
  } finally {
    gate.resolve();
    await pendingResponse;
    await Promise.all(tasks);
  }
  assert.deepEqual(await (await cache.match(new Request(CONTEXT_URL))).json(), { fresh: true });
});

test('servePublicCached catches background write failures in the retained task', async (t) => {
  t.mock.method(console, 'warn', () => {});
  const tasks = [];
  const context = { ...createContext(CONTEXT_URL), executionCtx: { waitUntil(task) { tasks.push(task); } } };
  const response = await servePublicCached(context, {
    async match() {},
    put() { throw new Error('cache write unavailable'); },
  }, async () => Response.json({ fresh: true }));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { fresh: true });
  assert.equal(tasks.length, 1);
  await Promise.all(tasks);
});

test('servePublicCached awaits writes when the host has no execution context', async () => {
  const gate = Promise.withResolvers();
  let stored = false;
  const context = {
    ...createContext(CONTEXT_URL),
    get executionCtx() { throw new Error('This context has no ExecutionContext'); },
  };
  const pendingResponse = servePublicCached(context, {
    async match() {},
    async put() { await gate.promise; stored = true; },
  }, async () => Response.json({ fresh: true }));

  try {
    assert.equal(await Promise.race([pendingResponse, setImmediate().then(() => 'pending')]), 'pending');
    assert.equal(stored, false);
  } finally {
    gate.resolve();
    await pendingResponse;
  }
  assert.equal(stored, true);
});

test('servePublicCached does not replace an upstream exception with a cache read failure', async (t) => {
  t.mock.method(console, 'warn', () => {});
  const upstreamError = new Error('upstream unavailable');
  await assert.rejects(servePublicCached(createContext(CONTEXT_URL), {
    async match() { throw new Error('cache unavailable'); },
    async put() { assert.fail('upstream failures must not be cached'); },
  }, async () => { throw upstreamError; }), error => error === upstreamError);
});
