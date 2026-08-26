import assert from 'node:assert/strict';
import test from 'node:test';

import { createApp } from '../src/app.ts';
import {
  PUBLIC_REQUEST_LIMIT,
  WRITE_REQUEST_LIMIT,
  consumeRateLimit,
  getClientIp,
  getRateLimitKey,
  isWriteMethod,
} from '../src/rate-limit.ts';

function createMemoryCache() {
  const items = new Map();

  return {
    async match(request) {
      const item = items.get(request.url);
      return item ? new Response(item, { headers: { 'Content-Type': 'application/json' } }) : undefined;
    },
    async put(request, response) {
      items.set(request.url, await response.text());
    },
  };
}

test('client IP prefers CF-Connecting-IP then X-Forwarded-For', () => {
  assert.equal(
    getClientIp(new Headers({ 'CF-Connecting-IP': '203.0.113.8' })),
    '203.0.113.8',
  );
  assert.equal(
    getClientIp(new Headers({ 'X-Forwarded-For': '198.51.100.2, 10.0.0.1' })),
    '198.51.100.2',
  );
  assert.equal(getClientIp(new Headers()), 'unknown');
});

test('write methods are separated from public reads', () => {
  assert.equal(isWriteMethod('GET'), false);
  assert.equal(isWriteMethod('HEAD'), false);
  assert.equal(isWriteMethod('OPTIONS'), false);
  assert.equal(isWriteMethod('POST'), true);
  assert.equal(getRateLimitKey('203.0.113.8', false), 'public:203.0.113.8');
  assert.equal(getRateLimitKey('203.0.113.8', true), 'write:203.0.113.8');
});

test('missing cache fails open', async () => {
  const result = await consumeRateLimit(undefined, 'public:1', 2, 1_000);

  assert.deepEqual(result, {
    allowed: true,
    limit: 2,
    remaining: 2,
    retryAfterSeconds: 0,
  });
});

test('consumeRateLimit counts within a window and blocks after the limit', async () => {
  const cache = createMemoryCache();
  const now = 1_700_000_000_000;

  const first = await consumeRateLimit(cache, 'public:1', 2, now);
  const second = await consumeRateLimit(cache, 'public:1', 2, now + 1_000);
  const third = await consumeRateLimit(cache, 'public:1', 2, now + 2_000);

  assert.equal(first.allowed, true);
  assert.equal(first.remaining, 1);
  assert.equal(second.allowed, true);
  assert.equal(second.remaining, 0);
  assert.equal(third.allowed, false);
  assert.equal(third.remaining, 0);
  assert.equal(third.retryAfterSeconds, 58);
});

test('consumeRateLimit resets after the window', async () => {
  const cache = createMemoryCache();
  const now = 1_700_000_000_000;

  await consumeRateLimit(cache, 'public:1', 1, now);
  const blocked = await consumeRateLimit(cache, 'public:1', 1, now + 1_000);
  const reset = await consumeRateLimit(cache, 'public:1', 1, now + 61_000);

  assert.equal(blocked.allowed, false);
  assert.equal(reset.allowed, true);
  assert.equal(reset.remaining, 0);
});

test('health stays available after other routes are rate limited', async () => {
  const cache = createMemoryCache();
  const app = createApp({ cache, now: () => 1_700_000_000_000 });
  const headers = { 'CF-Connecting-IP': '203.0.113.9' };

  for (let index = 0; index < PUBLIC_REQUEST_LIMIT; index += 1) {
    const response = await app.request('/missing', { headers });
    assert.equal(response.status, 404);
  }

  const limited = await app.request('/missing', { headers });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('Retry-After'), '60');
  assert.deepEqual(await limited.json(), {
    error: 'rate_limited',
    message: '请求过于频繁，请稍后再试。',
  });

  const health = await app.request('/health', { headers });
  assert.equal(health.status, 200);
});

test('write routes use a tighter limit than public reads', async () => {
  const cache = createMemoryCache();
  const app = createApp({
    cache,
    createStore: () => ({}),
    now: () => 1_700_000_000_000,
  });
  const headers = {
    'CF-Connecting-IP': '203.0.113.10',
    'Content-Type': 'application/json',
  };

  for (let index = 0; index < WRITE_REQUEST_LIMIT; index += 1) {
    const response = await app.request(
      '/me/reports',
      { headers, method: 'POST', body: '{}' },
      { DB: {} },
    );
    assert.notEqual(response.status, 429);
  }

  const limited = await app.request(
    '/me/reports',
    { headers, method: 'POST', body: '{}' },
    { DB: {} },
  );
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('RateLimit-Limit'), String(WRITE_REQUEST_LIMIT));
});
