import assert from 'node:assert/strict';
import test from 'node:test';

import { createApp } from '../src/app.ts';
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
