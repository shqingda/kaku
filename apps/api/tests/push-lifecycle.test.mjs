import assert from 'node:assert/strict';
import test from 'node:test';

import { createTestApp as createApp } from './helpers/app.mjs';
import { encryptSecret } from '../src/auth/crypto.ts';
import { pollRegisteredPushUsers } from '../src/push/poll.ts';
import { deliverPushForUser } from '../src/push/deliver.ts';

const now = 1_800_000_000_000;
const encryptionKey = Buffer.alloc(32, 7).toString('base64url');
const authHeaders = { Authorization: `Bearer ${'x'.repeat(32)}`, 'Content-Type': 'application/json' };

function device(overrides = {}) {
  return {
    lastNotificationId: 10, platform: 'android', provider: 'fcm', registrationId: 'registration-1',
    sessionId: 'session-1', token: 'fcm-native-token-one-1234567890', updatedAt: now, userId: 42,
    ...overrides,
  };
}

function createPushStore(initial = []) {
  const devices = initial.map((item) => ({ ...item }));
  const receipts = [];
  return {
    devices, receipts,
    async listUserIds() { return [...new Set(devices.map((item) => item.userId))]; },
    async listByUser(userId) { return devices.filter((item) => item.userId === userId).map((item) => ({ ...item })); },
    async save(input) {
      const index = devices.findIndex((item) => item.token === input.token);
      if (index < 0) devices.push({ ...input });
      else devices[index] = { ...input };
      return true;
    },
    async deleteByUserAndToken(userId, sessionId, token) {
      // Support the pre-fix call shape so the test observes its unsafe deletion.
      const legacyCall = token === undefined;
      const targetToken = legacyCall ? sessionId : token;
      for (let index = devices.length - 1; index >= 0; index -= 1) {
        const item = devices[index];
        if (item.userId === userId && item.token === targetToken && (legacyCall || item.sessionId === sessionId)) devices.splice(index, 1);
      }
    },
    async deleteByToken(token) {
      const index = devices.findIndex((item) => item.token === token);
      if (index >= 0) devices.splice(index, 1);
    },
    async deleteRegistration(snapshot) {
      const index = devices.findIndex((item) => item.token === snapshot.token && item.registrationId === snapshot.registrationId);
      if (index >= 0) devices.splice(index, 1);
    },
    async setLastNotificationId(userId, token, cursor) {
      const item = devices.find((entry) => entry.userId === userId && entry.token === token);
      if (item) item.lastNotificationId = cursor;
    },
    async commitDelivery({ devices: delivered, lastNotificationId, tickets, createdAt }) {
      for (const item of delivered) {
        const current = devices.find((entry) => entry.token === item.token && entry.registrationId === item.registrationId);
        if (current) current.lastNotificationId = lastNotificationId;
      }
      for (const ticket of tickets) {
        const item = delivered.find((entry) => entry.token === ticket.token);
        receipts.push({ ...item, createdAt, ticketId: ticket.id });
      }
    },
    async listPendingReceipts(at) { return receipts.filter((item) => item.createdAt <= at - 15 * 60_000 && item.createdAt > at - 24 * 60 * 60_000).map((item) => ({ ...item })); },
    async markReceiptChecks(ids, at) {
      for (const receipt of receipts) if (ids.includes(receipt.ticketId)) receipt.lastCheckedAt = at;
    },
    async deleteReceipts(ids) {
      for (let index = receipts.length - 1; index >= 0; index -= 1) {
        if (ids.includes(receipts[index].ticketId)) receipts.splice(index, 1);
      }
    },
    async deleteExpiredReceipts(at) {
      let deleted = 0;
      for (let index = receipts.length - 1; index >= 0; index -= 1) {
        if (receipts[index].createdAt <= at - 24 * 60 * 60_000) { receipts.splice(index, 1); deleted += 1; }
      }
      return deleted;
    },
  };
}

function notificationResponse() {
  return Response.json({ data: [{
    createdAt: now / 1000, id: 12, mainID: 1, relatedID: 0,
    sender: { avatar: {}, nickname: '杏', username: 'xing' },
    title: '回复', type: 3, unread: true,
  }], total: 1 });
}

async function createPollFixture(devices = [device()]) {
  const pushStore = createPushStore(devices);
  const credential = {
    accessToken: await encryptSecret('access-token', encryptionKey),
    accessTokenExpiresAt: now + 3_600_000,
    refreshToken: await encryptSecret('refresh-token', encryptionKey),
    updatedAt: now, userId: 42,
  };
  return {
    authStore: { async getBangumiCredential(userId) { return { ...credential, userId }; } },
    env: { DB: null, FCM_SERVICE_ACCOUNT_JSON: 'configured', APNS_KEY_ID: 'ABCDEFGHIJ', APNS_TEAM_ID: '1234567890', APNS_PRIVATE_KEY: 'configured', TOKEN_ENCRYPTION_KEY: encryptionKey },
    now, pushStore,
  };
}

test('push registration binds the current session and replaces its registration identity', async () => {
  const pushStore = createPushStore([device()]);
  const app = createApp({
    createPushDeviceStore: () => pushStore,
    createStore: () => ({ async authenticateSession() { return { sessionId: 'session-2', userId: 42, user: { id: 42 } }; } }),
    now: () => now,
  });
  const response = await app.request('/me/push-devices', {
    method: 'PUT', headers: authHeaders,
    body: JSON.stringify({ platform: 'android', provider: 'fcm', token: 'fcm-native-token-one-1234567890' }),
  }, { DB: null, FCM_SERVICE_ACCOUNT_JSON: 'configured', APNS_KEY_ID: 'ABCDEFGHIJ', APNS_TEAM_ID: '1234567890', APNS_PRIVATE_KEY: 'configured' });
  assert.equal(response.status, 200);
  assert.equal(pushStore.devices[0].sessionId, 'session-2');
  assert.match(pushStore.devices[0].registrationId, /^[a-f0-9-]{36}$/);
  assert.equal(pushStore.devices[0].lastNotificationId, null);
});

test('an old session cannot unregister a token rebound to a new session', async () => {
  const pushStore = createPushStore([device({ sessionId: 'session-2' })]);
  const app = createApp({
    createPushDeviceStore: () => pushStore,
    createStore: () => ({ async authenticateSession() { return { sessionId: 'session-1', userId: 42, user: { id: 42 } }; } }),
    now: () => now,
  });
  const response = await app.request('/me/push-devices', {
    method: 'DELETE', headers: authHeaders, body: JSON.stringify({ token: 'fcm-native-token-one-1234567890' }),
  }, { DB: null, FCM_SERVICE_ACCOUNT_JSON: 'configured', APNS_KEY_ID: 'ABCDEFGHIJ', APNS_TEAM_ID: '1234567890', APNS_PRIVATE_KEY: 'configured' });
  assert.equal(response.status, 200);
  assert.equal(pushStore.devices.length, 1);
});

test('a revoked registration cannot be recreated after authentication', async () => {
  const pushStore = createPushStore(); pushStore.save = async () => false;
  const app = createApp({ createPushDeviceStore: () => pushStore,
    createStore: () => ({ authenticateSession: async () => ({ sessionId: 'revoked', userId: 42, user: { id: 42 } }) }), now: () => now });
  const response = await app.request('/me/push-devices', { method: 'PUT', headers: authHeaders,
    body: JSON.stringify({ platform: 'android', provider: 'fcm', token: 'fcm-native-token-1234567890' }) }, { DB: null, FCM_SERVICE_ACCOUNT_JSON: 'configured', APNS_KEY_ID: 'ABCDEFGHIJ', APNS_TEAM_ID: '1234567890', APNS_PRIVATE_KEY: 'configured' });
  assert.equal(response.status, 401); assert.equal(pushStore.devices.length, 0);
});

test('an old session cannot unregister a token rebound to a replacement session', async () => {
  const pushStore = createPushStore([device({ sessionId: 'session-2' })]);
  const app = createApp({ createPushDeviceStore: () => pushStore,
    createStore: () => ({ authenticateSession: async () => ({ sessionId: 'session-1', userId: 42, user: { id: 42 } }) }), now: () => now });
  const response = await app.request('/me/push-devices', { method: 'DELETE', headers: authHeaders,
    body: JSON.stringify({ token: device().token }) }, { DB: null, FCM_SERVICE_ACCOUNT_JSON: 'configured', APNS_KEY_ID: 'ABCDEFGHIJ', APNS_TEAM_ID: '1234567890', APNS_PRIVATE_KEY: 'configured' });
  assert.equal(response.status, 200); assert.equal(pushStore.devices.length, 1);
});

test('legacy devices are retained, never sent to native providers and do not move cursors', async () => {
  const fixture = await createPollFixture([device({ provider: 'expo' }), device({ token: 'native', registrationId: 'native' })]);
  const sent = [];
  const result = await pollRegisteredPushUsers({ ...fixture, fetcher: async () => notificationResponse(),
    sendDevice: async item => { sent.push(item.token); return { status: 'accepted', id: 'message-1' }; } });
  assert.deepEqual(sent, ['native']); assert.equal(result.legacyDevices, 1);
  assert.deepEqual(fixture.pushStore.devices.map(item => item.lastNotificationId), [10, 12]);
  assert.equal(fixture.pushStore.receipts.length, 0, 'native acceptance must not create Expo receipt work');
});

test('revocation or replacement while notifications load prevents native sending', async () => {
  for (const revoke of [true, false]) {
    const fixture = await createPollFixture(); let sends = 0;
    await pollRegisteredPushUsers({ ...fixture, fetcher: async () => {
      if (revoke) fixture.pushStore.devices.splice(0); else fixture.pushStore.devices[0].registrationId = 'replacement';
      return notificationResponse();
    }, sendDevice: async () => { sends++; return { status: 'accepted', id: 'message' }; } });
    assert.equal(sends, 0);
  }
});

test('mixed native outcomes advance accepted cursors, keep retryable devices and precisely remove invalid registrations', async () => {
  const fixture = await createPollFixture(['accepted', 'retry', 'invalid', 'replaced'].map(token => device({ token, registrationId: token })));
  const result = await pollRegisteredPushUsers({ ...fixture, fetcher: async () => notificationResponse(),
    sendDevice: async item => {
      if (item.token === 'accepted') return { status: 'accepted', id: 'native-message' };
      if (item.token === 'retry') return { status: 'failed', error: 'provider_http_503' };
      if (item.token === 'replaced') fixture.pushStore.devices.find(x => x.token === item.token).registrationId = 'new';
      return { status: 'invalid' };
    } });
  assert.equal(result.failedUsers, 1); assert.equal(result.sentUsers, 1);
  assert.deepEqual(fixture.pushStore.devices.map(({ token, lastNotificationId }) => [token, lastNotificationId]), [['accepted', 12], ['retry', 10], ['replaced', 10]]);
});

test('invalid cleanup failure preserves accepted cursors; a thrown provider call does not discard other acceptances', async () => {
  const fixture = await createPollFixture(['accepted', 'invalid', 'throw'].map(token => device({ token, registrationId: token })));
  fixture.pushStore.deleteRegistration = async () => { throw new Error('cleanup unavailable'); };
  await pollRegisteredPushUsers({ ...fixture, fetcher: async () => notificationResponse(), sendDevice: async item => {
    if (item.token === 'accepted') return { status: 'accepted', id: 'id' };
    if (item.token === 'throw') throw new Error('offline');
    return { status: 'invalid' };
  } });
  assert.deepEqual(fixture.pushStore.devices.map(item => item.lastNotificationId), [12, 10, 10]);
});

test('missing credentials fail explicitly without requesting Expo or advancing cursors', async () => {
  for (const item of [device(), device({ provider: 'apns', platform: 'ios', apnsEnvironment: 'production', apnsTopic: 'com.shqingda.kaku' })]) {
    const fixture = await createPollFixture([item]);
    fixture.env.FCM_SERVICE_ACCOUNT_JSON = undefined; fixture.env.APNS_PRIVATE_KEY = undefined;
    const urls = [];
    const result = await pollRegisteredPushUsers({ ...fixture, fetcher: async url => { urls.push(String(url)); return notificationResponse(); } });
    assert.equal(result.failedUsers, 1); assert.equal(fixture.pushStore.devices[0].lastNotificationId, 10);
    assert.ok(urls.every(url => url.includes('/notify')));
  }
});

test('provider and user concurrency are bounded and independent users continue after failure', async () => {
  const fixture = await createPollFixture(Array.from({ length: 6 }, (_, index) => device({ userId: index + 1, token: `token-${index}`, registrationId: `reg-${index}` })));
  let active = 0, maximum = 0, calls = 0;
  const result = await pollRegisteredPushUsers({ ...fixture, fetcher: async () => {
    active++; maximum = Math.max(maximum, active); const call = ++calls;
    await new Promise(resolve => setTimeout(resolve, 5)); active--;
    if (call === 5) throw new Error('one user unavailable');
    return notificationResponse();
  }, sendDevice: async () => ({ status: 'accepted', id: 'id' }) });
  assert.equal(maximum, 4); assert.equal(result.failedUsers, 1); assert.equal(result.sentUsers, 5);
});

test('legacy receipts expire locally even without provider credentials, without Expo requests', async () => {
  const fixture = await createPollFixture([]);
  fixture.pushStore.receipts.push({ ...device(), ticketId: 'expired', createdAt: now - 24 * 60 * 60_000 });
  const result = await pollRegisteredPushUsers({ ...fixture, fetcher: async () => { throw new Error('must not fetch'); } });
  assert.equal(result.expiredReceipts, 1); assert.deepEqual(fixture.pushStore.receipts, []);
});

test('delivery commits earlier batches before a later batch fails', async () => {
  const devices = Array.from({ length: 101 }, (_, index) => device({ token: `token-${index}`, registrationId: `reg-${index}` }));
  const commits = [], batches = [];
  await assert.rejects(deliverPushForUser({ devices,
    loadNotifications: async () => ({ items: [{ id: 12, unread: true, sender: { nickname: '杏' }, action: '回复', title: '' }], unreadCount: 1 }),
    commitDelivery: async (batch, cursor) => { commits.push({ batch, cursor }); },
    sendPush: async tokens => { batches.push(tokens.length); if (batches.length === 2) throw new Error('later failure');
      return { failedTokens: [], invalidTokens: [], tickets: tokens.map(token => ({ token, id: token })) }; },
  }), /later failure/);
  assert.deepEqual(batches, [100, 1]); assert.equal(commits[0].batch.length, 100); assert.equal(commits[0].cursor, 12);
});
