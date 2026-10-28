import assert from 'node:assert/strict';
import { test } from 'node:test';
import { drizzle } from 'drizzle-orm/d1';
import { migrate } from 'drizzle-orm/d1/migrator';
import { Miniflare } from 'miniflare';
import { createD1AuthStore } from '../src/auth/store.ts';

test('same-account device login replaces old sessions but preserves other devices, accounts and legacy sessions', async () => {
  const mf = new Miniflare({ modules: [{ type: 'ESModule', path: 'index.mjs', contents: 'export default {fetch(){return new Response("ok")}}' }], d1Databases: { DB: 'device-identity-test' } });
  try {
    const database = await mf.getD1Database('DB');
    await migrate(drizzle(database), { migrationsFolder: 'drizzle' });
    const store = createD1AuthStore(database);
    const connections = new Map();
    for (const id of [1, 2]) connections.set(id, await store.saveBangumiLogin({
      accessToken: 'access', refreshToken: 'refresh', accessTokenExpiresAt: 10000, updatedAt: 1,
      user: { id, username: `user${id}`, nickname: `User ${id}` },
    }));
    const issue = (sessionId, userId, deviceKey, connectionId = connections.get(userId)) => store.createSessionForConnection({
      sessionId, userId, deviceKey, connectionId, deviceName: 'same model', createdAt: 1, expiresAt: 10000,
      refreshExpiresAt: 20000, tokenHash: `access-${sessionId}`, refreshTokenHash: `refresh-${sessionId}`,
    });
    await issue('old', 1, 'phone-a');
    await issue('other-phone', 1, 'phone-b');
    await issue('other-account', 2, 'phone-a');
    await issue('legacy-1', 1);
    await issue('legacy-2', 1);
    assert.equal(await issue('failed', 1, 'phone-a', 'obsolete-connection'), false);
    assert.ok(await store.authenticateSession('access-old', 2));
    assert.equal(await issue('new', 1, 'phone-a'), true);
    assert.equal(await store.authenticateSession('access-old', 2), null);
    assert.ok(await store.authenticateSession('access-new', 2));
    assert.deepEqual((await store.listSessions(1, 2)).map(s => s.sessionId).sort(), ['legacy-1', 'legacy-2', 'new', 'other-phone']);
    assert.deepEqual((await store.listSessions(2, 2)).map(s => s.sessionId), ['other-account']);
    await issue('newer', 1, 'phone-a');
    assert.equal((await store.listSessions(1, 2)).length, 4);
  } finally { await mf.dispose(); }
});
