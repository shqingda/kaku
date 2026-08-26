import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { drizzle } from 'drizzle-orm/d1';
import { migrate } from 'drizzle-orm/d1/migrator';
import { Miniflare } from 'miniflare';

import { createD1AuthStore } from '../src/auth/store.ts';

const NOW = 1_800_000_000_000;
const FUTURE = NOW + 60 * 60 * 1000;
const PAST = NOW - 60 * 1000;

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

test('saveBangumiLogin upserts the user and credential', async () => {
  await store.saveBangumiLogin({
    accessToken: 'encrypted-access-token',
    accessTokenExpiresAt: FUTURE,
    refreshToken: 'encrypted-refresh-token',
    updatedAt: NOW,
    user,
  });

  const credential = await store.getBangumiCredential(user.id);
  assert.equal(credential.accessToken, 'encrypted-access-token');
  assert.equal(credential.accessTokenExpiresAt, FUTURE);

  // 再次登录用新昵称：应是更新而非新增，用户与凭证仍各只有一条。
  await store.saveBangumiLogin({
    accessToken: 'new-access-token',
    accessTokenExpiresAt: FUTURE + 1000,
    refreshToken: 'new-refresh-token',
    updatedAt: NOW + 1000,
    user: { ...user, nickname: 'Kaku Renamed' },
  });

  const updated = await store.getBangumiCredential(user.id);
  assert.equal(updated.accessToken, 'new-access-token');
});

test('authenticateSession returns the session only for a valid unexpired token', async () => {
  await store.createSession({
    createdAt: NOW,
    deviceName: '测试设备',
    expiresAt: FUTURE,
    refreshExpiresAt: FUTURE,
    refreshTokenHash: 'refresh-hash',
    sessionId: 'session-1',
    tokenHash: 'token-hash',
    userId: user.id,
  });

  const valid = await store.authenticateSession('token-hash', NOW);
  assert.equal(valid.sessionId, 'session-1');
  assert.equal(valid.user.username, 'kaku-user');

  assert.equal(await store.authenticateSession('wrong-hash', NOW), null);
  assert.equal(await store.authenticateSession('token-hash', FUTURE + 1), null);
});

test('rotateSession swaps the refresh token atomically', async () => {
  const rotated = await store.rotateSession({
    expiresAt: FUTURE + 2000,
    lastUsedAt: NOW + 1000,
    previousRefreshTokenHash: 'refresh-hash',
    refreshExpiresAt: FUTURE + 2000,
    refreshTokenHash: 'refresh-hash-2',
    sessionId: 'session-1',
    tokenHash: 'token-hash-2',
  });

  assert.equal(rotated, true);

  // 旧 refresh hash 已失效，新 hash 可用。
  assert.equal(await store.getSessionForRefresh('refresh-hash', NOW), null);
  const refreshed = await store.getSessionForRefresh('refresh-hash-2', NOW);
  assert.equal(refreshed.sessionId, 'session-1');

  // 用旧 refresh hash 再次轮换应失败（防并发重复轮换）。
  const again = await store.rotateSession({
    expiresAt: FUTURE + 3000,
    lastUsedAt: NOW + 2000,
    previousRefreshTokenHash: 'refresh-hash',
    refreshExpiresAt: FUTURE + 3000,
    refreshTokenHash: 'refresh-hash-3',
    sessionId: 'session-1',
    tokenHash: 'token-hash-3',
  });
  assert.equal(again, false);
});

test('consumeHandoff is one-time', async () => {
  await store.createHandoff({
    codeHash: 'handoff-hash',
    createdAt: NOW,
    expiresAt: FUTURE,
    userId: user.id,
  });

  const first = await store.consumeHandoff('handoff-hash', NOW);
  assert.equal(first.username, 'kaku-user');

  assert.equal(await store.consumeHandoff('handoff-hash', NOW), null);
  assert.equal(await store.consumeHandoff('handoff-hash', FUTURE + 1), null);
});

test('listSessions only returns unexpired sessions ordered by recency', async () => {
  await store.createSession({
    createdAt: NOW,
    deviceName: '旧设备',
    expiresAt: FUTURE,
    refreshExpiresAt: FUTURE,
    refreshTokenHash: 'refresh-old',
    sessionId: 'session-old',
    tokenHash: 'token-old',
    userId: user.id,
  });

  const sessions = await store.listSessions(user.id, NOW);
  assert.equal(sessions.length, 2);
  // rotate 使 session-1 的 lastUsedAt 更新，应排在 session-old 之前。
  assert.equal(sessions[0].sessionId, 'session-1');
});

test('deleteOtherSessions keeps the current device session', async () => {
  const otherUser = {
    avatarUrl: 'https://lain.bgm.tv/b.jpg',
    id: 99,
    nickname: 'Other Device Owner',
    username: 'kaku-other-sessions',
  };
  await store.saveBangumiLogin({
    accessToken: 'other-user-access',
    accessTokenExpiresAt: FUTURE,
    refreshToken: 'other-user-refresh',
    updatedAt: NOW,
    user: otherUser,
  });
  await store.createSession({
    createdAt: NOW,
    deviceName: '当前设备',
    expiresAt: FUTURE,
    refreshExpiresAt: FUTURE,
    refreshTokenHash: 'other-current-refresh',
    sessionId: 'other-current',
    tokenHash: 'other-current-token',
    userId: otherUser.id,
  });
  await store.createSession({
    createdAt: NOW,
    deviceName: '另一台设备',
    expiresAt: FUTURE,
    refreshExpiresAt: FUTURE,
    refreshTokenHash: 'other-peer-refresh',
    sessionId: 'other-peer',
    tokenHash: 'other-peer-token',
    userId: otherUser.id,
  });

  const deleted = await store.deleteOtherSessions(otherUser.id, 'other-current');
  const remaining = await store.listSessions(otherUser.id, NOW);
  assert.equal(deleted, 1);
  assert.deepEqual(
    remaining.map((session) => session.sessionId),
    ['other-current'],
  );
});

test('deleteSessionById and deleteAllSessions remove the right rows', async () => {
  assert.equal(await store.deleteSessionById(user.id, 'session-old'), true);
  assert.equal(await store.deleteSessionById(user.id, 'session-old'), false);

  await store.deleteAllSessions(user.id);
  assert.equal(await store.authenticateSession('token-hash-2', NOW), null);
  assert.equal((await store.listSessions(user.id, NOW)).length, 0);
});

test('deleteBangumiCredential clears the credential', async () => {
  await store.deleteBangumiCredential(user.id);
  assert.equal(await store.getBangumiCredential(user.id), null);
});
