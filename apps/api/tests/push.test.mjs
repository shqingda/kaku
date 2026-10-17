import assert from 'node:assert/strict';
import test from 'node:test';

import { createTestApp as createApp } from './helpers/app.mjs';
import { deliverPushForUser } from '../src/push/deliver.ts';
import { composePushMessage } from '../src/push/message.ts';

const now = 1_800_000_000_000;
const env = { DB: null, FCM_SERVICE_ACCOUNT_JSON: 'configured', APNS_KEY_ID: 'ABCDEFGHIJ', APNS_TEAM_ID: '1234567890', APNS_PRIVATE_KEY: 'configured' };
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

function createPushStore() {
  const devices = [];

  return {
    store: {
      async deleteByToken(token) {
        const index = devices.findIndex((device) => device.token === token);
        if (index >= 0) devices.splice(index, 1);
      },
      async deleteByUserAndToken(userId, sessionId, token) {
        for (let index = devices.length - 1; index >= 0; index -= 1) {
          if (devices[index].userId === userId && devices[index].token === token && devices[index].sessionId === sessionId) devices.splice(index, 1);
        }
      },
      async listByUser(userId) {
        return devices.filter((device) => device.userId === userId);
      },
      async listUserIds() {
        return [...new Set(devices.map((device) => device.userId))];
      },
      async save(input) {
        const index = devices.findIndex((device) => device.token === input.token);
        if (index >= 0) devices[index] = { ...input };
        else devices.push({ ...input });
        return true;
      },
      async setLastNotificationId(userId, token, lastNotificationId) {
        devices.forEach((device, index) => {
          if (device.userId === userId && device.token === token) {
            devices[index] = { ...device, lastNotificationId };
          }
        });
      },
    },
    get devices() {
      return devices;
    },
  };
}

function notification(id, unread = true) {
  return {
    action: '回复了你的条目讨论',
    createdAt: now,
    id,
    sender: { nickname: '杏', username: 'xing' },
    title: '第一章',
    unread,
  };
}

test('PUT /me/push-devices rejects a malformed native token', async () => {
  const app = createApp({
    createPushDeviceStore: () => createPushStore().store,
    createStore: createAuthStore,
    now: () => now,
  });

  const response = await app.request(
    '/me/push-devices',
    {
      body: JSON.stringify({ platform: 'ios', token: 'not-a-token' }),
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      method: 'PUT',
    },
    env,
  );

  assert.equal(response.status, 400);
});

test('PUT and DELETE /me/push-devices register and remove a device', async () => {
  const push = createPushStore();
  const app = createApp({
    createPushDeviceStore: () => push.store,
    createStore: createAuthStore,
    now: () => now,
  });
  const token = 'fcm-native-token-'.concat('a'.repeat(100));

  const created = await app.request(
    '/me/push-devices',
    {
      body: JSON.stringify({ platform: 'android', provider: 'fcm', token }),
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      method: 'PUT',
    },
    env,
  );
  assert.equal(created.status, 200);
  assert.equal(push.devices.length, 1);
  assert.equal(push.devices[0].lastNotificationId, null);

  const removed = await app.request(
    '/me/push-devices',
    { body: JSON.stringify({ token }), headers: { ...authHeaders, 'Content-Type': 'application/json' }, method: 'DELETE' },
    env,
  );
  assert.equal(removed.status, 200);
  assert.equal(push.devices.length, 0);
});

test('composePushMessage summarizes one or many unread items', () => {
  assert.deepEqual(composePushMessage([notification(1)]), {
    body: '杏回复了你的条目讨论：第一章',
    title: 'Kaku',
  });
  assert.deepEqual(composePushMessage([notification(1), notification(2)]), {
    body: '2 条未读通知',
    title: 'Kaku',
  });
});

test('the first poll primes the cursor and does not send old notifications', async () => {
  const sent = [];
  const result = await deliverPushForUser({
    devices: [
      {
        lastNotificationId: null,
        platform: 'ios',
        token: 'ExponentPushToken[abc]',
        updatedAt: now,
        userId: 42,
      },
    ],
    loadNotifications: async () => ({
      items: [notification(9)],
      total: 1,
      unreadCount: 1,
    }),
    commitDelivery: async () => {},
    sendPush: async (tokens, payload) => {
      sent.push({ payload, tokens });
      return { failedTokens: [], invalidTokens: [], tickets: tokens.map((token) => ({ id: `ticket-${token}`, token })) };
    },
  });

  assert.equal(result.primed, true);
  assert.equal(result.sent, 0);
  assert.equal(sent.length, 0);
});

test('later polls send only unread items newer than the cursor', async () => {
  let cursor = 10;
  const sent = [];
  const result = await deliverPushForUser({
    devices: [
      {
        lastNotificationId: 10,
        platform: 'ios',
        token: 'ExponentPushToken[abc]',
        updatedAt: now,
        userId: 42,
      },
    ],
    loadNotifications: async () => ({
      items: [notification(12), notification(8, false)],
      total: 2,
      unreadCount: 1,
    }),
    commitDelivery: async (_devices, lastNotificationId) => {
      cursor = lastNotificationId;
    },
    sendPush: async (tokens, payload) => {
      sent.push({ payload, tokens });
      return { failedTokens: [], invalidTokens: [], tickets: tokens.map((token) => ({ id: `ticket-${token}`, token })) };
    },
  });

  assert.equal(result.primed, false);
  assert.equal(result.sent, 1);
  assert.equal(sent[0].payload.body, '杏回复了你的条目讨论：第一章');
  assert.equal(cursor, 12);
});

test('unregistering a device preserves other devices and rejects an unspecified target', async () => {
  const push = createPushStore();
  for (const [token, userId] of [['ExpoPushToken[a]', 42], ['ExpoPushToken[b]', 42], ['ExpoPushToken[c]', 43]]) {
    await push.store.save({ token, userId, platform: 'ios', updatedAt: now, lastNotificationId: 10, sessionId: 'session-1', registrationId: token });
  }
  const app = createApp({ createPushDeviceStore: () => push.store, createStore: createAuthStore, now: () => now });
  for (const token of [undefined, 'ExpoPushToken[c]', 'ExpoPushToken[a]']) {
    const response = await app.request('/me/push-devices', {
      method: 'DELETE', headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }, env);
    assert.equal(response.status, token ? 200 : 400);
  }
  assert.deepEqual(push.devices.map(device => device.token), ['ExpoPushToken[b]', 'ExpoPushToken[c]']);
});

test('a new device is primed without dropping pending notifications on older devices', async () => {
  const sent = [];
  const saved = [];
  const result = await deliverPushForUser({
    devices: [
      { token: 'old', userId: 42, platform: 'ios', updatedAt: now, lastNotificationId: 10 },
      { token: 'new', userId: 42, platform: 'ios', updatedAt: now, lastNotificationId: null },
      { token: 'caught-up', userId: 42, platform: 'ios', updatedAt: now, lastNotificationId: 12 },
    ],
    loadNotifications: async () => ({ items: [notification(12)], total: 1, unreadCount: 1 }),
    sendPush: async (tokens) => { sent.push(tokens); return { failedTokens: [], invalidTokens: [], tickets: tokens.map((token) => ({ id: token, token })) }; },
    commitDelivery: async (devices, cursor) => { devices.forEach(({ token }) => saved.push([token, cursor])); },
  });
  assert.deepEqual(sent, [['old']]);
  assert.deepEqual(saved, [['old', 12], ['new', 12]]);
  assert.equal(result.primed, true);
  assert.equal(result.sent, 1);
});

test('failed delivery does not advance the affected devices', async () => {
  const saved = [];
  await assert.rejects(deliverPushForUser({
    devices: [{ token: 'old', userId: 42, platform: 'ios', updatedAt: now, lastNotificationId: 10 }],
    loadNotifications: async () => ({ items: [notification(12)], total: 1, unreadCount: 1 }),
    sendPush: async () => { throw new Error('unavailable'); },
    commitDelivery: async (...args) => { saved.push(args); },
  }), /unavailable/);
  assert.deepEqual(saved, []);
});
