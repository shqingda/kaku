import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { drizzle } from 'drizzle-orm/d1';
import { migrate } from 'drizzle-orm/d1/migrator';
import { Miniflare } from 'miniflare';

import { createTestApp as createApp } from './helpers/app.mjs';
import { encryptSecret } from '../src/auth/crypto.ts';

const now = 1_800_000_000_000;
const TOKEN_KEY = Buffer.alloc(32, 7).toString('base64url');
const env = {
  BANGUMI_CLIENT_ID: 'kaku-client',
  BANGUMI_CLIENT_SECRET: 'server-only-secret',
  BANGUMI_REDIRECT_URI: 'https://api.kaku.app/auth/bangumi/callback',
  DB: null,
  TOKEN_ENCRYPTION_KEY: TOKEN_KEY,
};

let miniflare;
before(async () => {
  miniflare = new Miniflare({
    d1Databases: { DB: 'index-edit-test' },
    modules: [{ type: 'ESModule', path: 'index.mjs', contents: 'export default { fetch() { return new Response("ok"); } }' }],
  });
  env.DB = await miniflare.getD1Database('DB');
  await migrate(drizzle(env.DB), { migrationsFolder: 'drizzle' });
  await env.DB.prepare('INSERT INTO users (bangumi_user_id, username, nickname, created_at, updated_at) VALUES (42, ?, ?, ?, ?)')
    .bind('kaku', 'Kaku', now, now).run();
});
after(async () => { await miniflare?.dispose(); });
beforeEach(async () => { await env.DB.prepare('DELETE FROM index_write_locks').run(); });

const encryptedToken = await encryptSecret('bangumi-access-token', TOKEN_KEY);
const authHeaders = { Authorization: 'Bearer '.concat('x'.repeat(32)) };

function createAuthedApp(fetcher, state = { credentialDeleted: false }) {
  return createApp({
    createStore() {
      return {
        async authenticateSession() {
          return {
            sessionId: 'session-1',
            user: { id: 42, nickname: 'Kaku', username: 'kaku' },
            userId: 42,
          };
        },
        async getBangumiCredential() {
          return state.credentialDeleted
            ? null
            : {
                accessToken: encryptedToken,
                accessTokenExpiresAt: now + 3_600_000,
                refreshToken: 'encrypted-refresh-token',
                updatedAt: now,
                userId: 42,
              };
        },
        async deleteBangumiCredential() {
          state.credentialDeleted = true;
        },
      };
    },
    fetcher,
    now: () => now,
  });
}


const baseline = { title: '原目录', desc: '原说明', isPrivate: false };
function save(app, body) {
  return app.request('/me/indexes/42', {
    method: 'PATCH', headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, env);
}

test('two editors sharing a baseline cannot sequentially overwrite each other through the route', async () => {
  let stored = { title: baseline.title, desc: baseline.desc, private: false };
  let writes = 0;
  const app = createAuthedApp(async (_input, init) => {
    if (init.method === 'GET') return Response.json(stored);
    writes++;
    stored = JSON.parse(init.body);
    return Response.json({});
  });
  assert.equal((await save(app, { ...baseline, title: '设备 A', expected: baseline })).status, 200);
  const second = await save(app, { ...baseline, desc: '设备 B', expected: baseline });
  assert.equal(second.status, 412);
  assert.equal((await second.json()).error, 'index_edit_conflict');
  assert.deepEqual(stored, { title: '设备 A', desc: '原说明', private: false });
  assert.equal(writes, 1);
});

test('an unchanged baseline permits saving title, description and isPrivate', async () => {
  let stored = { title: baseline.title, desc: baseline.desc, private: false };
  const app = createAuthedApp(async (_input, init) => {
    if (init.method === 'GET') return Response.json(stored);
    stored = JSON.parse(init.body);
    return Response.json({});
  });
  const next = { title: '新目录', desc: '新说明', isPrivate: true };
  assert.equal((await save(app, { ...next, expected: baseline })).status, 200);
  assert.deepEqual(stored, { title: '新目录', desc: '新说明', private: true });
});

test('malformed baselines are rejected before contacting the provider', async () => {
  let calls = 0;
  const app = createAuthedApp(async () => { calls++; return Response.json({}); });
  for (const expected of [null, {}, { ...baseline, isPrivate: 'false' }]) {
    assert.equal((await save(app, { ...baseline, expected })).status, 400);
  }
  assert.equal(calls, 0);
});

test('a failed upstream snapshot read cannot fall through to PATCH', async () => {
  const methods = [];
  const app = createAuthedApp(async (_input, init) => {
    methods.push(init.method);
    return new Response(null, { status: 503 });
  });
  assert.equal((await save(app, { ...baseline, title: '新标题', expected: baseline })).status, 503);
  assert.deepEqual(methods, ['GET']);
});

test('legacy directory editors without a baseline retain their existing write contract', async () => {
  const methods = [];
  const app = createAuthedApp(async (_input, init) => {
    methods.push(init.method);
    return Response.json({});
  });
  assert.equal((await save(app, { title: '旧客户端', desc: '', private: true })).status, 200);
  assert.deepEqual(methods, ['PATCH']);
});


test('overlapping saves in separate app instances cannot both read and overwrite the same baseline', { timeout: 10_000 }, async () => {
  let stored = { title: baseline.title, desc: baseline.desc, private: false };
  let entered;
  const firstWriting = new Promise(resolve => { entered = resolve; });
  let release;
  const firstWriteMayComplete = new Promise(resolve => { release = resolve; });
  let writes = 0;
  let reads = 0;
  const fetcher = async (_input, init) => {
    if (init.method === 'GET') { reads++; return Response.json(stored); }
    writes++;
    if (writes === 1) { entered(); await firstWriteMayComplete; }
    stored = JSON.parse(init.body);
    return Response.json({});
  };
  const first = save(createAuthedApp(fetcher), { ...baseline, title: '设备 A', expected: baseline });
  await firstWriting;
  let second;
  try {
    second = await save(createAuthedApp(fetcher), { ...baseline, desc: '设备 B', expected: baseline });
  } finally {
    release();
  }
  assert.equal((await first).status, 200);
  assert.equal(second.status, 423);
  assert.equal(reads, 1);
  assert.equal(writes, 1);
  assert.deepEqual(stored, { title: '设备 A', desc: '原说明', private: false });
});


test('failed preflight releases the claim so a later save can succeed', async () => {
  let unavailable = true;
  let writes = 0;
  const app = createAuthedApp(async (_input, init) => {
    if (init.method === 'GET') return unavailable
      ? new Response(null, { status: 503 })
      : Response.json({ title: baseline.title, desc: baseline.desc, private: false });
    writes++;
    return Response.json({});
  });
  const body = { ...baseline, title: '新标题', expected: baseline };
  assert.equal((await save(app, body)).status, 503);
  unavailable = false;
  assert.equal((await save(app, body)).status, 200);
  assert.equal(writes, 1);
});

for (const failure of ['network', 503, 202]) {
  test(`unconfirmed write (${failure}) remains protected across app instances and time`, async () => {
    let stored = { title: baseline.title, desc: baseline.desc, private: false };
    let writes = 0;
    const fetcher = async (_input, init) => {
      if (init.method === 'GET') return Response.json(stored);
      writes++;
      stored = JSON.parse(init.body); // Upstream may apply the write before losing its response.
      if (failure === 'network') throw new TypeError('connection lost');
      return new Response(null, { status: failure });
    };
    const body = { ...baseline, title: '设备 A', expected: baseline };
    assert.equal((await save(createAuthedApp(fetcher), body)).status, 423);
    const row = await env.DB.prepare('SELECT operation_id FROM index_write_locks WHERE user_id = 42 AND index_id = 42').first();
    assert.ok(row.operation_id);
    // Even an old record cannot expire while the upstream outcome is unknown.
    await env.DB.prepare('UPDATE index_write_locks SET created_at = 0').run();
    const retry = await save(createAuthedApp(fetcher), { ...baseline, desc: '设备 B', expected: baseline });
    assert.equal(retry.status, 423);
    assert.equal((await retry.json()).error, 'index_write_unconfirmed');
    assert.equal(writes, 1);
    assert.equal(stored.title, '设备 A');
    assert.deepEqual(await env.DB.prepare('SELECT operation_id FROM index_write_locks WHERE user_id = 42 AND index_id = 42').first(), row);
  });
}

test('an explicit permission rejection releases the claim', async () => {
  let denied = true;
  const fetcher = async (_input, init) => init.method === 'GET'
    ? Response.json({ title: baseline.title, desc: baseline.desc, private: false })
    : new Response(null, { status: denied ? 403 : 204 });
  const body = { ...baseline, title: '新标题', expected: baseline };
  assert.equal((await save(createAuthedApp(fetcher), body)).status, 502);
  denied = false;
  assert.equal((await save(createAuthedApp(fetcher), body)).status, 200);
});

test('directory and account keys do not block unrelated operations', async () => {
  const { withIndexWriteLock } = await import('../src/indexes/write-lock.ts');
  await env.DB.prepare('INSERT INTO index_write_locks (user_id, index_id, operation_id, created_at) VALUES (42, 42, ?, ?)').bind('pending', now).run();
  for (const [userId, indexId] of [[42, 43], [43, 42]]) {
    assert.equal(await withIndexWriteLock({ database: env.DB, userId, indexId, now,
      fetcher: async () => Response.json({}), action: async () => 'saved' }), 'saved');
  }
  assert.equal((await env.DB.prepare('SELECT operation_id FROM index_write_locks WHERE user_id = 42 AND index_id = 42').first()).operation_id, 'pending');
});

test('deletion uses the same guard as saving', async () => {
  await env.DB.prepare('INSERT INTO index_write_locks (user_id, index_id, operation_id, created_at) VALUES (42, 42, ?, ?)').bind('saving', now).run();
  let calls = 0;
  const app = createAuthedApp(async () => { calls++; return Response.json({}); });
  const blocked = await app.request('/me/indexes/42', { method: 'DELETE', headers: authHeaders }, env);
  assert.equal(blocked.status, 423);
  assert.equal(calls, 0);
  await env.DB.prepare('DELETE FROM index_write_locks WHERE operation_id = ?').bind('saving').run();
  const deleted = await app.request('/me/indexes/42', { method: 'DELETE', headers: authHeaders }, env);
  assert.equal(deleted.status, 200);
  assert.equal(calls, 1);
});
