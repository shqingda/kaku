import assert from 'node:assert/strict';
import test from 'node:test';

import { createApp } from '../src/app.ts';

const now = 1_800_000_000_000;
const authHeaders = { Authorization: 'Bearer '.concat('x'.repeat(32)) };
const env = { DB: null };

function createTestApp(initial = null) {
  let current = initial;
  const app = createApp({
    createSearchHistoryStore: () => ({
      async get() { return current; },
      async save(next) { current = next; },
    }),
    createStore: () => ({
      async authenticateSession() {
        return {
          sessionId: 'session-1',
          user: { id: 42, nickname: 'Kaku', username: 'kaku' },
          userId: 42,
        };
      },
    }),
    now: () => now,
  });
  return { app, get current() { return current; } };
}

test('search history defaults to an empty unsaved record', async () => {
  const { app } = createTestApp();
  const response = await app.request(
    '/me/search-history',
    { headers: authHeaders },
    env,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    history: { items: [], updatedAt: null },
  });
});

test('search history saves at most eight unique trimmed terms', async () => {
  const state = createTestApp();
  const response = await state.app.request('/me/search-history', {
    body: JSON.stringify({ items: ['  Kaku  ', 'Bangumi', 'Kaku'] }),
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    method: 'PUT',
  }, env);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    history: { items: ['Kaku', 'Bangumi'], updatedAt: now },
  });
  assert.deepEqual(state.current, {
    items: ['Kaku', 'Bangumi'],
    updatedAt: now,
    userId: 42,
  });
});

test('search history rejects malformed or oversized records', async () => {
  const { app } = createTestApp();
  const response = await app.request('/me/search-history', {
    body: JSON.stringify({ items: Array.from({ length: 9 }, (_, index) => `${index}`) }),
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    method: 'PUT',
  }, env);

  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, 'invalid_search_history');
});
