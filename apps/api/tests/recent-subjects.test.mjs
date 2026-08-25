import assert from 'node:assert/strict';
import test from 'node:test';

import { createApp } from '../src/app.ts';

const now = 1_800_000_000_000;
const authHeaders = { Authorization: 'Bearer '.concat('x'.repeat(32)) };
const env = { DB: null };
const subject = {
  coverUrl: 'https://lain.bgm.tv/pic/cover/c/example.jpg',
  id: 123,
  title: '无职转生',
  type: 2,
  viewedAt: now - 1_000,
};

function createTestApp(initial = null) {
  let current = initial;
  const app = createApp({
    createRecentSubjectsStore: () => ({
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

test('recent subjects default to an empty unsaved record', async () => {
  const { app } = createTestApp();
  const response = await app.request(
    '/me/recent-subjects',
    { headers: authHeaders },
    env,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    recentSubjects: { items: [], updatedAt: null },
  });
});

test('recent subjects save validated unique snapshots', async () => {
  const state = createTestApp();
  const response = await state.app.request('/me/recent-subjects', {
    body: JSON.stringify({ items: [subject, subject] }),
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    method: 'PUT',
  }, env);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    recentSubjects: { items: [subject], updatedAt: now },
  });
  assert.deepEqual(state.current, {
    items: [subject],
    updatedAt: now,
    userId: 42,
  });
});

test('recent subjects reject malformed or oversized records', async () => {
  const { app } = createTestApp();
  const response = await app.request('/me/recent-subjects', {
    body: JSON.stringify({
      items: Array.from({ length: 11 }, (_, index) => ({
        ...subject,
        id: index + 1,
      })),
    }),
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    method: 'PUT',
  }, env);

  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, 'invalid_recent_subjects');
});
