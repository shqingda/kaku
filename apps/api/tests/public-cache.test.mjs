import assert from 'node:assert/strict';
import test from 'node:test';

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
    300,
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
    300,
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
    300,
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
    300,
    async () => Response.json({ fresh: true }),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('X-Kaku-Cache'), 'MISS');
  assert.deepEqual(await response.json(), { fresh: true });
});
