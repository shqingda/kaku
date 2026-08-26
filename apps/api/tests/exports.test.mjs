import assert from 'node:assert/strict';
import test from 'node:test';

import { createApp } from '../src/app.ts';
import { EXPORT_TTL_MS } from '../src/exports/store.ts';

const now = 1_800_000_000_000;
const env = { DB: null, EXPORTS: {} };
const authHeaders = {
  Authorization: 'Bearer '.concat('x'.repeat(32)),
};

function createAuthStore() {
  return {
    async authenticateSession() {
      return {
        sessionId: 'session-1',
        user: { id: 42, nickname: 'Kaku', username: 'kaku' },
        userId: 42,
      };
    },
  };
}

function createMemoryExportStore() {
  const records = [];
  const bodies = new Map();

  return {
    records,
    store: {
      async create({ body, format, id, now: createdAt, userId }) {
        const record = {
          byteSize: new TextEncoder().encode(body).byteLength,
          createdAt,
          expiresAt: createdAt + EXPORT_TTL_MS,
          format,
          id,
          objectKey: `exports/${userId}/${id}.${format}`,
          userId,
        };
        records.unshift(record);
        bodies.set(`${userId}:${id}`, body);
        while (records.length > 5) records.pop();
        return record;
      },
      async delete(userId, id) {
        const index = records.findIndex(
          (record) => record.userId === userId && record.id === id,
        );
        if (index < 0) return false;
        records.splice(index, 1);
        bodies.delete(`${userId}:${id}`);
        return true;
      },
      async deleteExpired() {
        return 0;
      },
      async get(userId, id) {
        const record = records.find(
          (item) => item.userId === userId && item.id === id,
        );
        const body = bodies.get(`${userId}:${id}`);
        if (!record || body === undefined) return null;
        return { body, record };
      },
      async list(userId) {
        return records.filter((record) => record.userId === userId);
      },
    },
  };
}

function appWithExports(exports = createMemoryExportStore()) {
  return {
    app: createApp({
      createExportId: () => 'export-1',
      createExportStore: () => exports.store,
      createStore: createAuthStore,
      now: () => now,
    }),
    exports,
  };
}

test('cloud exports are unavailable when R2 is not bound', async () => {
  const response = await createApp().request('/me/exports', {
    headers: authHeaders,
  }, { DB: null });

  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, 'exports_unavailable');
});

test('POST /me/exports stores a backup and GET returns it', async () => {
  const { app } = appWithExports();
  const created = await app.request(
    '/me/exports',
    {
      body: JSON.stringify({
        content: '{"source":"bangumi-public-collections"}',
        format: 'json',
      }),
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      method: 'POST',
    },
    env,
  );

  assert.equal(created.status, 201);
  const createdBody = await created.json();
  assert.equal(createdBody.export.id, 'export-1');
  assert.equal(createdBody.export.format, 'json');
  assert.equal(createdBody.export.createdAt, now);
  assert.equal(createdBody.export.expiresAt, now + EXPORT_TTL_MS);
  assert.equal(createdBody.export.byteSize > 0, true);

  const listed = await app.request('/me/exports', { headers: authHeaders }, env);
  assert.equal((await listed.json()).exports[0].id, 'export-1');

  const downloaded = await app.request(
    '/me/exports/export-1',
    { headers: authHeaders },
    env,
  );
  assert.equal(downloaded.status, 200);
  assert.equal(
    downloaded.headers.get('Content-Type'),
    'application/json; charset=utf-8',
  );
  assert.equal(
    await downloaded.text(),
    '{"source":"bangumi-public-collections"}',
  );
});

test('POST /me/exports rejects empty or oversized payloads', async () => {
  const { app } = appWithExports();
  const invalid = await app.request(
    '/me/exports',
    {
      body: JSON.stringify({ content: '', format: 'json' }),
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      method: 'POST',
    },
    env,
  );
  assert.equal(invalid.status, 400);

  const oversized = await app.request(
    '/me/exports',
    {
      body: JSON.stringify({ content: 'x'.repeat(800_001), format: 'csv' }),
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      method: 'POST',
    },
    env,
  );
  assert.equal(oversized.status, 400);
});

test('DELETE /me/exports/:id removes only the owner backup', async () => {
  const { app } = appWithExports();
  await app.request(
    '/me/exports',
    {
      body: JSON.stringify({ content: 'id,title\n1,Kaku', format: 'csv' }),
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      method: 'POST',
    },
    env,
  );

  const missing = await app.request(
    '/me/exports/missing',
    { headers: authHeaders, method: 'DELETE' },
    env,
  );
  assert.equal(missing.status, 404);

  const deleted = await app.request(
    '/me/exports/export-1',
    { headers: authHeaders, method: 'DELETE' },
    env,
  );
  assert.equal(deleted.status, 200);
  assert.deepEqual(await deleted.json(), { deleted: true });
});
