import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { Miniflare } from 'miniflare';
import { drizzle } from 'drizzle-orm/d1';
import { migrate } from 'drizzle-orm/d1/migrator';
import { createD1AuthStore } from '../src/auth/store.ts';
import { getValidBangumiAccessToken } from '../src/auth/bangumi-token-service.ts';
import { encryptSecret, decryptSecret } from '../src/auth/crypto.ts';
const NOW = 1_800_000_000_000;
const key = Buffer.alloc(32, 7).toString('base64url');
const env = { TOKEN_ENCRYPTION_KEY: key, BANGUMI_CLIENT_ID: 'test', BANGUMI_CLIENT_SECRET: 'test', BANGUMI_REDIRECT_URI: 'https://test.invalid/callback' };
let mf, store;
before(async () => {
  mf = new Miniflare({ d1Databases: { DB: 'lifecycle-test' }, modules: [{ type: 'ESModule', path: 'index.mjs', contents: 'export default {fetch(){return new Response("ok")}}' }] });
  const db = await mf.getD1Database('DB');
  await migrate(drizzle(db), { migrationsFolder: 'drizzle' });
  store = createD1AuthStore(db);
});
after(async () => mf?.dispose());
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
async function connect(id, access = 'expired') {
  await store.saveBangumiLogin({ accessToken: await encryptSecret(access, key), refreshToken: await encryptSecret('refresh-' + id, key), accessTokenExpiresAt: NOW - 1, updatedAt: NOW, user: { id, username: 'user-' + id, nickname: 'Test' } });
  return store.getBangumiCredential(id);
}
function refreshed(id) { return Response.json({ access_token: 'fresh-' + id, refresh_token: 'rotated-' + id, expires_in: 3600, user_id: id }); }

test('paused refresh cannot recreate a disconnected credential', async () => {
  await connect(101);
  const entered = deferred(), finish = deferred();
  const refreshing = getValidBangumiAccessToken({ env, store, now: NOW, userId: 101, fetcher: async () => { entered.resolve(); await finish.promise; return refreshed(101); } });
  await entered.promise;
  await store.deleteBangumiCredential(101, (await store.getBangumiCredential(101)).connectionId);
  finish.resolve();
  await assert.rejects(refreshing, { name: 'BangumiRefreshPendingError' });
  assert.equal(await store.getBangumiCredential(101), null);
});

test('paused refresh cannot overwrite a newly authorized connection', async () => {
  const previous = await connect(102);
  const entered = deferred(), finish = deferred();
  const refreshing = getValidBangumiAccessToken({ env, store, now: NOW, userId: 102, fetcher: async () => { entered.resolve(); await finish.promise; return refreshed(102); } });
  await entered.promise;
  await connect(102, 'new-connection');
  finish.resolve();
  await assert.rejects(refreshing, { name: 'BangumiRefreshPendingError' });
  const current = await store.getBangumiCredential(102);
  assert.notEqual(current.connectionId, previous.connectionId);
  assert.equal(await decryptSecret(current.accessToken, key), 'new-connection');
});

test('concurrent refresh waits for the winner to persist, without a second upstream exchange', async () => {
  await connect(103);
  const entered = deferred(), finish = deferred();
  let fetches = 0, waits = 0;
  const fetcher = async () => { fetches++; entered.resolve(); await finish.promise; return refreshed(103); };
  const winner = getValidBangumiAccessToken({ env, store, now: NOW, userId: 103, fetcher });
  await entered.promise;
  const waiter = getValidBangumiAccessToken({ env, store, now: NOW, userId: 103, fetcher, wait: async () => { waits++; finish.resolve(); await winner; } });
  assert.equal(await waiter, 'fresh-103');
  assert.equal(await winner, 'fresh-103');
  assert.equal(fetches, 1);
  assert.ok(waits >= 1);
});

test('a busy refresh stops after bounded reads and returns retryable status instead of reauthorization', async () => {
  const credential = await connect(104);
  await store.claimBangumiRefresh({ ...credential, operationId: 'busy-owner', now: NOW, leaseExpiresAt: NOW + 60_000 });
  let waits = 0;
  await assert.rejects(getValidBangumiAccessToken({ env, store, now: NOW, userId: 104, fetcher: async () => { throw new Error('must not exchange'); }, wait: async () => { waits++; } }), { name: 'BangumiRefreshPendingError' });
  assert.equal(waits, 10);
  assert.equal((await store.getBangumiCredential(104)).refreshOperationId, 'busy-owner');
});

test('an expired unconfirmed claim never replays the old refresh, and reconnect permits a new one', async () => {
  const credential = await connect(105);
  const claim = { ...credential, now: NOW, leaseExpiresAt: NOW + 10, operationId: 'owner-a' };
  assert.equal(await store.claimBangumiRefresh(claim), true);
  assert.equal(await store.claimBangumiRefresh({ ...claim, now: NOW + 60_000, operationId: 'owner-b' }), false);
  let fetches = 0;
  await assert.rejects(getValidBangumiAccessToken({ env, store, now: NOW + 60_000, userId: 105, fetcher: async () => { fetches++; return refreshed(105); } }), { name: 'BangumiRefreshUnconfirmedError' });
  assert.equal(fetches, 0);
  await connect(105, 'new-connection');
  const save = { ...credential, updatedAt: NOW, previousRefreshToken: credential.refreshToken, operationId: 'owner-a' };
  assert.equal(await store.saveBangumiCredential(save), false);
  assert.equal(await getValidBangumiAccessToken({ env, store, now: NOW + 60_001, userId: 105, fetcher: async () => { fetches++; return refreshed(105); } }), 'fresh-105');
  assert.equal(fetches, 1);
});

test('a late upstream authorization failure cannot revoke a newer connection or its sessions', async () => {
  const old = await connect(106);
  await connect(106, 'new-generation');
  await store.createSession({ createdAt: NOW, deviceName: 'current', expiresAt: NOW + 1000, refreshExpiresAt: NOW + 2000, refreshTokenHash: 'refresh-106', tokenHash: 'token-106', sessionId: 'session-106', userId: 106 });
  await store.deleteBangumiCredential(106, old.connectionId);
  assert.equal(await decryptSecret((await store.getBangumiCredential(106)).accessToken, key), 'new-generation');
  assert.equal((await store.authenticateSession('token-106', NOW)).sessionId, 'session-106');
});


test('a 200 refresh for the wrong user retains the claim and cannot replay after its deadline', async () => {
  await connect(107);
  let exchanges = 0;
  const fetcher = async () => { exchanges++; return refreshed(999); };
  await assert.rejects(getValidBangumiAccessToken({ env, store, now: NOW, userId: 107, fetcher }), { name: 'BangumiRefreshUnconfirmedError' });
  assert.ok((await store.getBangumiCredential(107)).refreshOperationId);
  await assert.rejects(getValidBangumiAccessToken({ env, store, now: NOW + 61_000, userId: 107, fetcher }), { name: 'BangumiRefreshUnconfirmedError' });
  assert.equal(exchanges, 1);
});
