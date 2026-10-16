import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { drizzle } from 'drizzle-orm/d1';
import { migrate } from 'drizzle-orm/d1/migrator';
import { Hono } from 'hono';
import { Miniflare } from 'miniflare';

import { hashToken } from '../src/auth/crypto.ts';
import { registerAuthRoutes } from '../src/auth/routes.ts';
import { createD1AuthStore } from '../src/auth/store.ts';

const NOW = 1_800_000_000_000;
const codeVerifier = 'v'.repeat(43);
const requestId = '75164bd7-cdb1-42e6-8595-79273b2b90bf';
let miniflare, database, store;

before(async () => {
  miniflare = new Miniflare({
    d1Databases: { DB: 'bound-session-test' },
    modules: [{ type: 'ESModule', path: 'index.mjs', contents: 'export default {fetch(){return new Response("ok")}}' }],
  });
  database = await miniflare.getD1Database('DB');
  await migrate(drizzle(database), { migrationsFolder: 'drizzle' });
  store = createD1AuthStore(database);
});
after(async () => miniflare?.dispose());

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

async function connect(userId, accessToken = 'current-access') {
  await store.saveBangumiLogin({
    accessToken, accessTokenExpiresAt: NOW + 3_600_000, refreshToken: 'refresh-' + accessToken,
    updatedAt: NOW, user: { id: userId, username: 'bound-user-' + userId, nickname: 'Test' },
  });
  return store.getBangumiCredential(userId);
}

async function createSession(userId, sessionId) {
  const token = 'session-token-' + sessionId;
  await store.createSession({
    createdAt: NOW, deviceName: 'Test', expiresAt: NOW + 3_600_000,
    refreshExpiresAt: NOW + 7_200_000, refreshTokenHash: 'refresh-' + sessionId,
    sessionId, tokenHash: await hashToken(token), userId,
  });
  return token;
}

async function createHandoff(userId, connectionId) {
  const code = 'handoff-code-for-user-' + userId;
  await store.createHandoff({
    codeHash: await hashToken(code), codeChallenge: await hashToken(codeVerifier), connectionId,
    requestId, createdAt: NOW, expiresAt: NOW + 60_000, userId,
  });
  return code;
}

function createApp(authStore = store) {
  const app = new Hono();
  registerAuthRoutes(app, { createStore: () => authStore, now: () => NOW });
  return app;
}

function exchange(app, code, verifier = codeVerifier) {
  return app.request('/auth/session', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, codeVerifier: verifier, requestId }),
  }, { DB: database });
}

test('an old disconnect returns connection_changed and preserves a newly authorized connection and session', async () => {
  const userId = 201;
  await connect(userId, 'old');
  const oldToken = await createSession(userId, 'old-disconnect');
  const entered = deferred(), finish = deferred();
  const app = createApp({
    ...store,
    async authenticateSession(...args) {
      const authentication = await store.authenticateSession(...args);
      entered.resolve();
      await finish.promise;
      return authentication;
    },
  });
  const disconnecting = app.request('/auth/connection', {
    method: 'DELETE', headers: { Authorization: `Bearer ${oldToken}` },
  }, { DB: database });
  await entered.promise;
  const current = await connect(userId, 'new');
  const newToken = await createSession(userId, 'new-after-disconnect');
  finish.resolve();

  const response = await disconnecting;
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, 'connection_changed');
  assert.equal((await store.getBangumiCredential(userId)).connectionId, current.connectionId);
  assert.ok(await store.authenticateSession(await hashToken(newToken), NOW));
});

for (const transition of ['disconnect', 'reconnect']) {
  test(`a consumed handoff cannot issue a session after ${transition}`, async () => {
    const userId = transition === 'disconnect' ? 202 : 203;
    const previous = await connect(userId);
    const code = await createHandoff(userId, previous.connectionId);
    const entered = deferred(), finish = deferred();
    const pause = (write) => async (input) => {
      entered.resolve();
      await finish.promise;
      return write(input);
    };
    const app = createApp({
      ...store,
      createSession: pause((input) => store.createSession(input)),
      createSessionForConnection: pause((input) => store.createSessionForConnection(input)),
    });
    const exchanging = exchange(app, code);
    await entered.promise;
    if (transition === 'disconnect') {
      await store.deleteBangumiCredential(userId, previous.connectionId);
    } else {
      await connect(userId, 'reconnected');
    }
    finish.resolve();

    const response = await exchanging;
    assert.equal(response.status, 409);
    assert.equal((await response.json()).error, 'connection_changed');
    assert.deepEqual(await store.listSessions(userId, NOW), []);
    if (transition === 'reconnect') {
      assert.equal((await store.getBangumiCredential(userId)).accessToken, 'reconnected');
    }
  });
}

test('a handoff from an older connection cannot borrow the new connection when consumed', async () => {
  const userId = 204;
  const previous = await connect(userId, 'old');
  const code = await createHandoff(userId, previous.connectionId);
  const current = await connect(userId, 'new');

  const response = await exchange(createApp(), code);

  assert.equal(response.status, 401);
  assert.equal((await response.json()).error, 'invalid_handoff_code');
  assert.deepEqual(await store.listSessions(userId, NOW), []);
  assert.equal((await store.getBangumiCredential(userId)).connectionId, current.connectionId);
});

test('wrong proof preserves the handoff and the matching connection can issue exactly one session', async () => {
  const userId = 205;
  const current = await connect(userId);
  const code = await createHandoff(userId, current.connectionId);
  const app = createApp();

  assert.equal((await exchange(app, code, 'w'.repeat(43))).status, 401);
  const response = await exchange(app, code);
  assert.equal(response.status, 200);
  const session = await response.json();
  const authenticated = await store.authenticateSession(await hashToken(session.sessionToken), NOW);
  assert.equal(authenticated.connectionId, current.connectionId);
  assert.equal((await exchange(app, code)).status, 401);
  assert.equal((await store.listSessions(userId, NOW)).length, 1);
});

test('disconnect reports whether it removed the expected connection', async () => {
  const userId = 206;
  const current = await connect(userId);

  assert.equal(await store.deleteBangumiCredential(userId, 'another-connection'), false);
  assert.equal(await store.deleteBangumiCredential(userId, null), false);
  assert.equal(await store.deleteBangumiCredential(userId, current.connectionId), true);
  assert.equal(await store.getBangumiCredential(userId), null);
});

test('a matching disconnect removes the current server session', async () => {
  const userId = 208;
  await connect(userId);
  const token = await createSession(userId, 'matching-disconnect');

  const response = await createApp().request('/auth/connection', {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  }, { DB: database });

  assert.equal(response.status, 200);
  assert.equal(await store.getBangumiCredential(userId), null);
  assert.equal(await store.authenticateSession(await hashToken(token), NOW), null);
});

test('legacy handoffs without a connection binding cannot issue sessions', async () => {
  const userId = 207;
  await connect(userId);
  const code = 'legacy-handoff-code-for-user-' + userId;
  await database.prepare(`
    INSERT INTO auth_handoffs (code_hash, code_challenge, request_id, created_at, expires_at, user_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(await hashToken(code), await hashToken(codeVerifier), requestId, NOW, NOW + 60_000, userId).run();

  assert.equal((await exchange(createApp(), code)).status, 401);
  assert.deepEqual(await store.listSessions(userId, NOW), []);
});
