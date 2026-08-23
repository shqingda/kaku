import assert from 'node:assert/strict';
import test from 'node:test';

import { createApp } from '../src/app.ts';

const now = 1_800_000_000_000;
const env = { DB: null };

function createAuthStore() {
  return {
    async authenticateSession() {
      return {
        sessionId: 'session-1',
        user: { id: 42, nickname: 'Kaku', username: 'kaku' },
        userId: 42,
      };
    },
    async deleteBangumiCredential() {},
  };
}

function createPreferencesStore(initial = null) {
  let current = initial;

  return {
    store: {
      async get(userId) {
        return current ? { ...current, userId } : null;
      },
      async save(input) {
        current = { ...input };
      },
    },
    get current() {
      return current;
    },
  };
}

const authHeaders = {
  Authorization: 'Bearer '.concat('x'.repeat(32)),
};

test('GET /me/preferences returns defaults when nothing is stored', async () => {
  const preferences = createPreferencesStore();
  const app = createApp({
    createPreferencesStore: () => preferences.store,
    createStore: createAuthStore,
    now: () => now,
  });

  const response = await app.request('/me/preferences', {
    headers: authHeaders,
  }, env);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    preferences: {
      locale: 'system',
      theme: 'system',
      updatedAt: null,
    },
  });
});

test('GET /me/preferences returns stored values', async () => {
  const preferences = createPreferencesStore({
    locale: 'zh',
    theme: 'dark',
    updatedAt: now,
    userId: 42,
  });
  const app = createApp({
    createPreferencesStore: () => preferences.store,
    createStore: createAuthStore,
    now: () => now,
  });

  const response = await app.request('/me/preferences', {
    headers: authHeaders,
  }, env);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    preferences: {
      locale: 'zh',
      theme: 'dark',
      updatedAt: now,
    },
  });
});

test('PUT /me/preferences merges partial updates and saves', async () => {
  const preferences = createPreferencesStore({
    locale: 'zh',
    theme: 'dark',
    updatedAt: now,
    userId: 42,
  });
  const app = createApp({
    createPreferencesStore: () => preferences.store,
    createStore: createAuthStore,
    now: () => now,
  });

  const response = await app.request('/me/preferences', {
    body: JSON.stringify({ theme: 'light' }),
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    method: 'PUT',
  }, env);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    preferences: {
      locale: 'zh',
      theme: 'light',
      updatedAt: now,
    },
  });
  assert.equal(preferences.current.locale, 'zh');
  assert.equal(preferences.current.theme, 'light');
  assert.equal(preferences.current.userId, 42);
});

test('PUT /me/preferences rejects invalid values', async () => {
  const app = createApp({
    createPreferencesStore: () => createPreferencesStore().store,
    createStore: createAuthStore,
    now: () => now,
  });

  const response = await app.request('/me/preferences', {
    body: JSON.stringify({ theme: 'neon' }),
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    method: 'PUT',
  }, env);

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: 'invalid_preferences',
    message: '偏好设置格式不正确。',
  });
});

test('preferences routes require a Kaku session', async () => {
  const app = createApp({
    createPreferencesStore: () => createPreferencesStore().store,
    createStore: () => ({
      async authenticateSession() {
        return null;
      },
    }),
    now: () => now,
  });

  const response = await app.request('/me/preferences', {
    headers: { Authorization: 'Bearer short' },
  }, env);

  assert.equal(response.status, 401);
});
