import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { drizzle } from 'drizzle-orm/d1';
import { migrate } from 'drizzle-orm/d1/migrator';
import { Miniflare } from 'miniflare';
import { createApp } from '../src/app.ts';
import { createD1RateLimitStore, getRateLimitPolicy } from '../src/rate-limit.ts';

let miniflare;
let database;
const now = 1_800_000_000_000;
function cache() {
  const records = new Map();
  return {
    async match(request) { const value = records.get(request.url); return value ? new Response(value) : undefined; },
    async put(request, response) { records.set(request.url, await response.text()); },
  };
}
before(async () => {
  miniflare = new Miniflare({ d1Databases: { DB: 'rate-limit-test' }, modules: [{ type: 'ESModule', path: 'index.mjs', contents: 'export default { fetch() { return new Response("ok"); } }' }] });
  database = await miniflare.getD1Database('DB');
  await migrate(drizzle(database), { migrationsFolder: 'drizzle' });
});
after(async () => { await miniflare?.dispose(); });
beforeEach(async () => { await database.prepare('DELETE FROM rate_limit_buckets').run(); });

test('one hundred concurrent business writes admit exactly forty requests', async () => {
  const apps = [createApp({ cache: cache(), now: () => now }), createApp({ cache: cache(), now: () => now })];
  const statuses = await Promise.all(Array.from({ length: 100 }, (_, index) => apps[index % 2].request('/me/reports', {
    method: 'POST', headers: { 'CF-Connecting-IP': '203.0.113.1', 'Content-Type': 'application/json' }, body: '{}',
  }, { DB: database }).then(response => response.status)));
  assert.equal(statuses.filter(status => status !== 429).length, 40);
  assert.equal(statuses.filter(status => status === 429).length, 60);
  assert.ok(statuses.every(status => status === 400 || status === 429));
});

test('D1 windows recover exactly at expiry and store only hashed IP bucket keys', async () => {
  const store = createD1RateLimitStore(database);
  const input = { key: 'business-write:203.0.113.123', limit: 1, now };
  assert.equal((await store.consume(input)).allowed, true);
  assert.equal((await store.consume({ ...input, now: now + 1 })).allowed, false);
  const reset = await store.consume({ ...input, now: now + 60_000 });
  assert.equal(reset.allowed, true);
  assert.equal(reset.remaining, 0);
  const rows = (await database.prepare('SELECT key, count, reset_at FROM rate_limit_buckets').all()).results;
  assert.equal(rows.length, 1);
  assert.match(rows[0].key, /^[a-f0-9]{64}$/);
  assert.equal(rows[0].key.includes('203.0.113.123'), false);
});

test('login, exchange, refresh, authentication writes and business writes have independent budgets', async () => {
  const store = createD1RateLimitStore(database);
  for (const [path, method, expectedLimit] of [
    ['/auth/bangumi/start', 'GET', 10], ['/auth/bangumi/callback', 'GET', 10],
    ['/auth/session', 'POST', 10], ['/auth/session/refresh', 'POST', 30],
    ['/auth/sessions', 'DELETE', 40], ['/me/reports', 'POST', 40],
  ]) {
    const policy = getRateLimitPolicy(path, method);
    assert.equal(policy.limit, expectedLimit);
    assert.equal(policy.atomic, true);
    const statuses = await Promise.all(Array.from({ length: expectedLimit + 1 }, () => store.consume({ key: `${policy.bucket}:203.0.113.9`, limit: policy.limit, now })));
    assert.equal(statuses.filter(value => value.allowed).length, expectedLimit, path);
  }
  assert.equal(getRateLimitPolicy('/me/collections/42', 'GET').atomic, false);
});

test('GET login start cannot bypass the strict budget by changing spoofed X-Forwarded-For', async () => {
  const app = createApp({ now: () => now });
  const statuses = await Promise.all(Array.from({ length: 11 }, (_, index) => app.request('/auth/bangumi/start', { headers: { 'X-Forwarded-For': `198.51.100.${index}` } }, { DB: database }).then(response => response.status)));
  assert.equal(statuses.filter(status => status === 429).length, 1);
  assert.equal((await database.prepare('SELECT count(*) AS count FROM rate_limit_buckets').first()).count, 1);
});

test('missing or failed D1 fails closed for costly routes without falling back to Cache', async () => {
  let cacheWrites = 0;
  const app = createApp({ cache: { async match() {}, async put() { cacheWrites++; } } });
  for (const DB of [undefined, { prepare() { throw new Error('D1 unavailable'); } }]) {
    for (const [path, method] of [['/auth/bangumi/start', 'GET'], ['/me/reports', 'POST']]) {
      const result = await app.request(path, { method }, { DB });
      assert.equal(result.status, 503);
      assert.equal((await result.json()).error, 'rate_limit_unavailable');
    }
  }
  assert.equal(cacheWrites, 0);
  assert.equal((await app.request('/health')).status, 200);
  assert.notEqual((await app.request('/auth/bangumi/start', { method: 'OPTIONS' })).status, 503);
});
