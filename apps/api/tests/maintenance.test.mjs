import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { drizzle } from 'drizzle-orm/d1';
import { migrate } from 'drizzle-orm/d1/migrator';
import { Miniflare } from 'miniflare';

import { createD1AuthStore } from '../src/auth/store.ts';
import { cleanupExpiredAuthData } from '../src/maintenance.ts';

const NOW = 1_800_000_000_000;
const PAST = NOW - 60_000;
const FUTURE = NOW + 60_000;

const WORKER_MODULES = [
  {
    type: 'ESModule',
    path: 'index.mjs',
    contents: 'export default { fetch() { return new Response("ok"); } }',
  },
];

let miniflare;
let store;

before(async () => {
  miniflare = new Miniflare({
    d1Databases: { DB: 'kaku-test' },
    modules: WORKER_MODULES,
  });
  const database = await miniflare.getD1Database('DB');
  await migrate(drizzle(database), { migrationsFolder: 'drizzle' });
  store = createD1AuthStore(database);
});

after(async () => {
  await miniflare?.dispose();
});

const user = {
  avatarUrl: 'https://lain.bgm.tv/a.jpg',
  id: 42,
  nickname: 'Kaku',
  username: 'kaku-user',
};

test('cleanupExpiredAuthData removes only expired handoffs, transactions and sessions', async () => {
  await store.saveBangumiLogin({
    accessToken: 'encrypted-access-token',
    accessTokenExpiresAt: FUTURE,
    refreshToken: 'encrypted-refresh-token',
    updatedAt: NOW,
    user,
  });

  await store.createHandoff({
    codeHash: 'expired-handoff',
    createdAt: PAST,
    expiresAt: PAST,
    userId: user.id,
  });
  await store.createOAuthTransaction({
    appRedirectUri: 'kaku://auth/callback',
    createdAt: PAST,
    expiresAt: PAST,
    stateHash: 'expired-oauth-state',
  });
  await store.createSession({
    createdAt: PAST,
    deviceName: '过期设备',
    expiresAt: PAST,
    refreshExpiresAt: PAST,
    refreshTokenHash: 'expired-refresh-hash',
    sessionId: 'expired-session',
    tokenHash: 'expired-token-hash',
    userId: user.id,
  });
  await store.createSession({
    createdAt: NOW,
    deviceName: '有效设备',
    expiresAt: FUTURE,
    refreshExpiresAt: FUTURE,
    refreshTokenHash: 'active-refresh-hash',
    sessionId: 'active-session',
    tokenHash: 'active-token-hash',
    userId: user.id,
  });

  const result = await cleanupExpiredAuthData(
    await miniflare.getD1Database('DB'),
    NOW,
  );

  assert.deepEqual(result, {
    deletedAuthHandoffs: 1,
    deletedOAuthTransactions: 1,
    deletedSessions: 1,
  });

  const remainingSessions = await store.listSessions(user.id, NOW);
  assert.deepEqual(
    remainingSessions.map((session) => session.sessionId),
    ['active-session'],
  );
});
