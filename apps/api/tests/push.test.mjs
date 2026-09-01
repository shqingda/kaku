import assert from 'node:assert/strict';
import test from 'node:test';

import { createApp } from '../src/app.ts';
import { deliverPushForUser } from '../src/push/deliver.ts';
import { composePushMessage } from '../src/push/message.ts';
import { sendExpoPush } from '../src/push/expo-client.ts';

const now = 1_800_000_000_000;
const env = { DB: null };
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
      async deleteByUser(userId) {
        for (let index = devices.length - 1; index >= 0; index -= 1) {
          if (devices[index].userId === userId) devices.splice(index, 1);
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
      },
      async setLastNotificationId(userId, lastNotificationId) {
        devices.forEach((device, index) => {
          if (device.userId === userId) {
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

test('PUT /me/push-devices rejects a malformed Expo token', async () => {
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
  const token = 'ExponentPushToken[abc]';

  const created = await app.request(
    '/me/push-devices',
    {
      body: JSON.stringify({ platform: 'ios', token }),
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
    { headers: authHeaders, method: 'DELETE' },
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
    saveCursor: async () => {},
    sendPush: async (tokens, payload) => {
      sent.push({ payload, tokens });
      return [];
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
    saveCursor: async (lastNotificationId) => {
      cursor = lastNotificationId;
    },
    sendPush: async (tokens, payload) => {
      sent.push({ payload, tokens });
      return [];
    },
  });

  assert.equal(result.primed, false);
  assert.equal(result.sent, 1);
  assert.equal(sent[0].payload.body, '杏回复了你的条目讨论：第一章');
  assert.equal(cursor, 12);
});

test('sendExpoPush authenticates with the Expo access token', async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url: String(url), init });
    return Response.json({
      data: [{ status: 'ok' }],
    });
  };

  const invalid = await sendExpoPush(
    fetcher,
    ['ExponentPushToken[abc]'],
    { body: '有新通知', title: 'Kaku', unreadCount: 1 },
    { accessToken: 'expo-token' },
  );

  assert.equal(invalid.length, 0);
  assert.equal(calls[0].init.headers.Authorization, 'Bearer expo-token');
  assert.deepEqual(JSON.parse(calls[0].init.body)[0].to, 'ExponentPushToken[abc]');
});

test('sendExpoPush reports misconfiguration instead of failing silently', async () => {
  const fetcher = async () =>
    Response.json({
      data: [
        {
          status: 'error',
          details: { error: 'InvalidCredentials' },
          message: 'Credentials are misconfigured',
        },
      ],
    });

  await assert.rejects(
    sendExpoPush(
      fetcher,
      ['ExponentPushToken[abc]'],
      { body: '有新通知', title: 'Kaku', unreadCount: 1 },
      { accessToken: 'expo-token' },
    ),
    /InvalidCredentials/,
  );
});

test('sendExpoPush still cleans up unregistered devices', async () => {
  const fetcher = async () =>
    Response.json({
      data: [
        { status: 'error', details: { error: 'DeviceNotRegistered' } },
      ],
    });

  const invalid = await sendExpoPush(
    fetcher,
    ['ExponentPushToken[stale]'],
    { body: '有新通知', title: 'Kaku', unreadCount: 1 },
    { accessToken: 'expo-token' },
  );

  assert.deepEqual(invalid, ['ExponentPushToken[stale]']);
});
