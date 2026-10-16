import assert from 'node:assert/strict';
import test from 'node:test';

import { createTestApp as createApp } from './helpers/app.mjs';
import { encryptSecret } from '../src/auth/crypto.ts';
import { pollRegisteredPushUsers } from '../src/push/poll.ts';
import { getExpoPushReceipts, sendExpoPush } from '../src/push/expo-client.ts';
import { deliverPushForUser } from '../src/push/deliver.ts';

const now = 1_800_000_000_000;
const encryptionKey = Buffer.alloc(32, 7).toString('base64url');
const authHeaders = { Authorization: `Bearer ${'x'.repeat(32)}`, 'Content-Type': 'application/json' };

function device(overrides = {}) {
  return {
    lastNotificationId: 10, platform: 'ios', registrationId: 'registration-1',
    sessionId: 'session-1', token: 'ExpoPushToken[one]', updatedAt: now, userId: 42,
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
    env: { DB: null, EXPO_ACCESS_TOKEN: 'expo-token', TOKEN_ENCRYPTION_KEY: encryptionKey },
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
    body: JSON.stringify({ platform: 'ios', token: 'ExpoPushToken[one]' }),
  }, { DB: null });
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
    method: 'DELETE', headers: authHeaders, body: JSON.stringify({ token: 'ExpoPushToken[one]' }),
  }, { DB: null });
  assert.equal(response.status, 200);
  assert.equal(pushStore.devices.length, 1);
});

test('revocation while notifications are loading prevents a new Expo send', async () => {
  const fixture = await createPollFixture();
  let sends = 0;
  const result = await pollRegisteredPushUsers({ ...fixture, fetcher: async (url) => {
    if (String(url).includes('/notify')) {
      fixture.pushStore.devices.splice(0);
      return notificationResponse();
    }
    sends += 1;
    return Response.json({ data: [{ status: 'ok', id: 'ticket-1' }] });
  } });
  assert.equal(sends, 0);
  assert.equal(result.sentUsers, 0);
});

test('successful Expo tickets are durably associated with the registration before cursor advancement', async () => {
  const fixture = await createPollFixture();
  await pollRegisteredPushUsers({ ...fixture, fetcher: async (url) => String(url).includes('/notify')
    ? notificationResponse()
    : Response.json({ data: [{ status: 'ok', id: 'ticket-1' }] }) });
  assert.deepEqual(fixture.pushStore.receipts.map(({ ticketId, registrationId }) => ({ ticketId, registrationId })), [
    { ticketId: 'ticket-1', registrationId: 'registration-1' },
  ]);
  assert.equal(fixture.pushStore.devices[0].lastNotificationId, 12);
});


test('a registration revoked before its conditional save is rejected', async () => {
  const pushStore = createPushStore();
  pushStore.save = async () => false;
  const app = createApp({
    createPushDeviceStore: () => pushStore,
    createStore: () => ({ async authenticateSession() { return { sessionId: 'revoked', userId: 42, user: { id: 42 } }; } }),
    now: () => now,
  });
  const response = await app.request('/me/push-devices', {
    method: 'PUT', headers: authHeaders, body: JSON.stringify({ platform: 'ios', token: 'ExpoPushToken[one]' }),
  }, { DB: null });
  assert.equal(response.status, 401);
  assert.equal(pushStore.devices.length, 0);
});

test('a replacement registration during notification loading is not sent the previous snapshot', async () => {
  const fixture = await createPollFixture();
  let sends = 0;
  await pollRegisteredPushUsers({ ...fixture, fetcher: async (url) => {
    if (String(url).includes('/notify')) {
      fixture.pushStore.devices[0].registrationId = 'replacement';
      return notificationResponse();
    }
    sends += 1;
    return Response.json({ data: [] });
  } });
  assert.equal(sends, 0);
  assert.equal(fixture.pushStore.devices[0].lastNotificationId, 10);
});

test('mixed Expo tickets persist accepted devices while retryable devices keep their cursors', async () => {
  const fixture = await createPollFixture([device(), device({ token: 'ExpoPushToken[two]', registrationId: 'two' })]);
  const result = await pollRegisteredPushUsers({ ...fixture, fetcher: async (url) => String(url).includes('/notify')
    ? notificationResponse()
    : Response.json({ data: [{ status: 'ok', id: 'ticket-1' }, { status: 'error', details: { error: 'InvalidCredentials' } }] }) });
  assert.equal(result.failedUsers, 1);
  assert.equal(result.sentUsers, 1);
  assert.deepEqual(fixture.pushStore.devices.map((item) => item.lastNotificationId), [12, 10]);
  assert.equal(fixture.pushStore.receipts[0].ticketId, 'ticket-1');
});

test('delivery splits more than one hundred devices without losing earlier tickets if a later batch fails', async () => {
  const devices = Array.from({ length: 101 }, (_, index) => device({ token: `token-${index}`, registrationId: `reg-${index}` }));
  const commits = [];
  const batches = [];
  await assert.rejects(deliverPushForUser({
    devices,
    loadNotifications: async () => ({ items: [{ id: 12, unread: true, sender: { nickname: '杏' }, action: '回复', title: '' }], unreadCount: 1 }),
    commitDelivery: async (batch, cursor, tickets) => { commits.push({ batch, cursor, tickets }); },
    sendPush: async (tokens) => {
      batches.push(tokens.length);
      if (batches.length === 2) throw new Error('later batch failed');
      return { failedTokens: [], invalidTokens: [], tickets: tokens.map((token) => ({ id: `ticket-${token}`, token })) };
    },
  }), /later batch failed/);
  assert.deepEqual(batches, [100, 1]);
  assert.equal(commits[0].tickets.length, 100);
  assert.equal(commits[0].cursor, 12);
});

test('a later batch failure still removes invalid registrations without deleting their replacements', async (t) => {
  for (const failure of ['send', 'commit']) {
    await t.test(failure, async () => {
      const fixture = await createPollFixture(Array.from({ length: 101 }, (_, index) => device({
        token: `ExpoPushToken[${index}]`, registrationId: `registration-${index}`,
      })));
      const commit = fixture.pushStore.commitDelivery;
      let commits = 0;
      fixture.pushStore.commitDelivery = async (input) => {
        commits += 1;
        if (failure === 'commit' && commits === 2) throw new Error('later cursor commit failed');
        await commit(input);
      };
      let batches = 0;
      const result = await pollRegisteredPushUsers({ ...fixture, fetcher: async (url, init) => {
        if (String(url).includes('/notify')) return notificationResponse();
        const messages = JSON.parse(init.body);
        batches += 1;
        if (batches === 2 && failure === 'send') throw new Error('later send failed');
        if (batches === 1) fixture.pushStore.devices[1].registrationId = 'replacement';
        return Response.json({ data: messages.map((message, index) => batches === 1 && index < 2
          ? { status: 'error', details: { error: 'DeviceNotRegistered' } }
          : { status: 'ok', id: `ticket-${message.to}` }) });
      } });
      assert.equal(batches, 2);
      assert.equal(result.failedUsers, 1);
      assert.equal(fixture.pushStore.devices.some((item) => item.token === 'ExpoPushToken[0]'), false);
      assert.equal(fixture.pushStore.devices.find((item) => item.token === 'ExpoPushToken[1]')?.registrationId, 'replacement');
    });
  }
});

test('a failed invalid-registration cleanup does not discard accepted tickets in the same batch', async () => {
  const fixture = await createPollFixture([
    device(), device({ token: 'ExpoPushToken[two]', registrationId: 'two' }),
  ]);
  fixture.pushStore.deleteRegistration = async () => { throw new Error('cleanup unavailable'); };
  await pollRegisteredPushUsers({ ...fixture, fetcher: async (url) => String(url).includes('/notify')
    ? notificationResponse()
    : Response.json({ data: [
      { status: 'error', details: { error: 'DeviceNotRegistered' } },
      { status: 'ok', id: 'ticket-two' },
    ] }) });
  assert.equal(fixture.pushStore.devices[0].lastNotificationId, 10);
  assert.equal(fixture.pushStore.devices[1].lastNotificationId, 12);
  assert.deepEqual(fixture.pushStore.receipts.map(({ ticketId }) => ticketId), ['ticket-two']);
});

test('Expo send and receipt requests use authentication and bounded request signals', async () => {
  const requests = [];
  const fetcher = async (url, init) => {
    requests.push({ url: String(url), init });
    return Response.json(String(url).endsWith('/getReceipts')
      ? { data: { 'ticket-1': { status: 'ok' } } }
      : { data: [{ status: 'ok', id: 'ticket-1' }] });
  };
  await sendExpoPush(fetcher, ['ExpoPushToken[one]'], { body: '新通知', title: 'Kaku', unreadCount: 1 }, { accessToken: 'token' });
  const receipts = await getExpoPushReceipts(fetcher, ['ticket-1'], { accessToken: 'token' });
  assert.deepEqual(receipts, { 'ticket-1': { status: 'ok' } });
  for (const { init } of requests) {
    assert.equal(init.headers.Authorization, 'Bearer token');
    assert.ok(init.signal instanceof AbortSignal);
    assert.equal(init.signal.aborted, false);
  }
  assert.deepEqual(JSON.parse(requests[1].init.body), { ids: ['ticket-1'] });
});

test('malformed or unavailable Expo receipts fail explicitly and empty or oversized requests are bounded', async () => {
  for (const body of [null, {}, { data: [] }, { data: { id: { status: 'pending' } } }, { data: { id: { status: 'error', details: null } } }]) {
    await assert.rejects(getExpoPushReceipts(async () => Response.json(body), ['id']), /无法识别/);
  }
  await assert.rejects(getExpoPushReceipts(async () => new Response('', { status: 503 }), ['id']), /503/);
  await assert.rejects(sendExpoPush(async () => new Response('', { status: 429 }), ['token'], { body: '', title: '', unreadCount: 0 }), /429/);
  await assert.rejects(getExpoPushReceipts(async () => { throw new Error('must not fetch'); }, Array(1001).fill('id')), /1000/);
  await assert.rejects(sendExpoPush(async () => { throw new Error('must not fetch'); }, Array(101).fill('token'), { body: '', title: '', unreadCount: 0 }), /100/);
  assert.deepEqual(await getExpoPushReceipts(async () => { throw new Error('must not fetch'); }, []), {});
  assert.deepEqual(await sendExpoPush(async () => { throw new Error('must not fetch'); }, [], { body: '', title: '', unreadCount: 0 }), { failedTokens: [], invalidTokens: [], tickets: [] });
});

test('receipt polling waits fifteen minutes, retires checked tickets and stops permanently invalid registrations', async () => {
  const fixture = await createPollFixture([device({ lastNotificationId: 12 })]);
  fixture.pushStore.receipts.push(
    { ...device(), ticketId: 'invalid', createdAt: now - 15 * 60_000 },
    { ...device(), ticketId: 'later', createdAt: now - 14 * 60_000 },
    { ...device(), ticketId: 'missing', createdAt: now - 15 * 60_000 },
  );
  const result = await pollRegisteredPushUsers({ ...fixture, fetcher: async (url, init) => {
    assert.ok(String(url).endsWith('/getReceipts'));
    assert.deepEqual(JSON.parse(init.body).ids, ['invalid', 'missing']);
    return Response.json({ data: { invalid: { status: 'error', details: { error: 'DeviceNotRegistered' } } } });
  } });
  assert.equal(result.checkedReceipts, 1);
  assert.equal(result.failedReceipts, 1);
  assert.equal(fixture.pushStore.devices.length, 0);
  assert.deepEqual(fixture.pushStore.receipts.map((item) => item.ticketId), ['later', 'missing']);
  assert.equal(fixture.pushStore.receipts.find((item) => item.ticketId === 'missing').lastCheckedAt, now);
});

test('a late permanent-failure receipt preserves a newer registration of the same token', async () => {
  const fixture = await createPollFixture([device({ registrationId: 'replacement', lastNotificationId: 12 })]);
  fixture.pushStore.receipts.push({ ...device(), ticketId: 'old-ticket', createdAt: now - 15 * 60_000 });
  const result = await pollRegisteredPushUsers({ ...fixture, fetcher: async (url) => String(url).endsWith('/getReceipts')
    ? Response.json({ data: { 'old-ticket': { status: 'error', details: { error: 'DeviceNotRegistered' } } } })
    : notificationResponse() });
  assert.equal(result.checkedReceipts, 1);
  assert.equal(fixture.pushStore.devices[0].registrationId, 'replacement');
  assert.equal(fixture.pushStore.receipts.length, 0);
});

test('receipt service failure keeps pending tickets and does not prevent independent user delivery', async () => {
  const fixture = await createPollFixture();
  fixture.pushStore.receipts.push({ ...device(), ticketId: 'pending', createdAt: now - 15 * 60_000 });
  const result = await pollRegisteredPushUsers({ ...fixture, fetcher: async (url) => {
    if (String(url).endsWith('/getReceipts')) return new Response('', { status: 503 });
    return String(url).includes('/notify') ? notificationResponse() : Response.json({ data: [{ status: 'ok', id: 'new' }] });
  } });
  assert.equal(result.failedReceipts, 1);
  assert.equal(result.sentUsers, 1);
  assert.deepEqual(fixture.pushStore.receipts.map((item) => item.ticketId), ['pending', 'new']);
});

test('receipt success and non-device failures are retired while expired tickets have bounded retention', async () => {
  const fixture = await createPollFixture([device({ lastNotificationId: 12 })]);
  fixture.pushStore.receipts.push(
    { ...device(), ticketId: 'ok', createdAt: now - 15 * 60_000 },
    { ...device(), ticketId: 'config', createdAt: now - 15 * 60_000 },
    { ...device(), ticketId: 'expired', createdAt: now - 24 * 60 * 60_000 },
  );
  const result = await pollRegisteredPushUsers({ ...fixture, fetcher: async (url) => String(url).endsWith('/getReceipts')
    ? Response.json({ data: { ok: { status: 'ok' }, config: { status: 'error', details: { error: 'InvalidCredentials' } } } })
    : notificationResponse() });
  assert.equal(result.checkedReceipts, 2);
  assert.equal(result.expiredReceipts, 1);
  assert.equal(result.failedReceipts, 1);
  assert.equal(fixture.pushStore.receipts.length, 0);
  assert.equal(fixture.pushStore.devices.length, 1);
});

test('polling uses four concurrent user workers and isolates one user failure', async () => {
  const fixture = await createPollFixture(Array.from({ length: 6 }, (_, index) => device({ userId: index + 1, token: `token-${index}`, registrationId: `reg-${index}` })));
  let active = 0;
  let maximum = 0;
  let started = 0;
  let release;
  let fourStarted;
  const gate = new Promise((resolve) => { release = resolve; });
  const ready = new Promise((resolve) => { fourStarted = resolve; });
  const polling = pollRegisteredPushUsers({ ...fixture, fetcher: async (url) => {
    if (!String(url).includes('/notify')) return Response.json({ data: [{ status: 'ok', id: `ticket-${started}` }] });
    active += 1;
    started += 1;
    const requestNumber = started;
    maximum = Math.max(maximum, active);
    if (started === 4) fourStarted();
    await gate;
    active -= 1;
    if (requestNumber === 5) throw new Error('one unavailable user');
    return notificationResponse();
  } });
  let timer;
  try { await Promise.race([ready, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('workers stayed serial')), 2000); })]); }
  finally { clearTimeout(timer); release(); }
  const result = await polling;
  assert.equal(maximum, 4);
  assert.equal(result.users, 6);
  assert.ok(result.sentUsers >= 4);
  assert.equal(result.failedUsers, 1);
});

test('missing Expo configuration fails visibly without notification requests or cursor movement', async () => {
  const fixture = await createPollFixture();
  fixture.env.EXPO_ACCESS_TOKEN = undefined;
  const result = await pollRegisteredPushUsers({ ...fixture, fetcher: async () => { throw new Error('must not fetch'); } });
  assert.equal(result.failedUsers, 1);
  assert.equal(fixture.pushStore.devices[0].lastNotificationId, 10);
});


test('hanging Expo requests abort at the configured twelve-second deadline', async (t) => {
  const originalTimeout = AbortSignal.timeout;
  const deadlines = [];
  t.mock.method(AbortSignal, 'timeout', (milliseconds) => {
    deadlines.push(milliseconds);
    return originalTimeout(5);
  });
  const hangingFetch = async (_url, init) => new Promise((_, reject) => {
    const timer = setTimeout(() => reject(new Error('request did not abort')), 1000);
    init.signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(init.signal.reason);
    }, { once: true });
  });
  await assert.rejects(sendExpoPush(hangingFetch, ['token'], { body: '', title: '', unreadCount: 0 }), { name: 'TimeoutError' });
  await assert.rejects(getExpoPushReceipts(hangingFetch, ['ticket']), { name: 'TimeoutError' });
  assert.deepEqual(deadlines, [12_000, 12_000]);
});

test('confirmed receipts are removed in a single bounded database operation', async () => {
  const fixture = await createPollFixture([]);
  fixture.pushStore.receipts.push(...['one', 'two'].map((ticketId) => ({ ...device(), ticketId, createdAt: now - 15 * 60_000 })));
  const batches = [];
  const originalDelete = fixture.pushStore.deleteReceipts;
  fixture.pushStore.deleteReceipts = async (ids) => { batches.push(ids); await originalDelete(ids); };
  await pollRegisteredPushUsers({ ...fixture, fetcher: async () => Response.json({ data: { one: { status: 'ok' }, two: { status: 'ok' } } }) });
  assert.deepEqual(batches, [['one', 'two']]);
});

test('receipt retention is enforced even while Expo sending is not configured', async () => {
  const fixture = await createPollFixture([]);
  fixture.env.EXPO_ACCESS_TOKEN = undefined;
  fixture.pushStore.receipts.push({ ...device(), ticketId: 'expired-without-config', createdAt: now - 24 * 60 * 60_000 });
  const result = await pollRegisteredPushUsers({ ...fixture, fetcher: async () => { throw new Error('must not fetch'); } });
  assert.equal(result.expiredReceipts, 1);
  assert.deepEqual(fixture.pushStore.receipts, []);
});
