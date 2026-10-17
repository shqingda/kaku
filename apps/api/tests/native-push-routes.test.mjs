import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestApp } from './helpers/app.mjs';
const headers = { Authorization: `Bearer ${'x'.repeat(32)}`, 'Content-Type': 'application/json' };
const fcmToken = 'fcm_native_'.concat('x'.repeat(100));
function fixture() {
  const saved = [], removed = [];
  const app = createTestApp({ now: () => 1800000000000,
    createStore: () => ({ authenticateSession: async () => ({ userId: 42, user: { id: 42 }, sessionId: 'session' }) }),
    createPushDeviceStore: () => ({ listByUser: async () => [], save: async input => { saved.push(input); return true; },
      deleteByUserAndToken: async (...args) => { removed.push(args); } }),
  });
  const request = (method, body) => app.request('/me/push-devices', { method, headers, body: JSON.stringify(body) }, { DB: null, FCM_SERVICE_ACCOUNT_JSON: 'configured', APNS_KEY_ID: 'ABCDEFGHIJ', APNS_TEAM_ID: '1234567890', APNS_PRIVATE_KEY: 'configured' });
  return { saved, removed, request };
}
test('native FCM and APNs registrations preserve provider, environment and topic', async () => {
  const f = fixture();
  assert.equal((await f.request('PUT', { provider: 'fcm', platform: 'android', token: fcmToken })).status, 200);
  assert.equal((await f.request('PUT', { provider: 'apns', platform: 'ios', token: 'ab'.repeat(32), apnsEnvironment: 'sandbox', apnsTopic: 'com.shqingda.kaku.debug' })).status, 200);
  assert.equal(f.saved[0].provider, 'fcm');
  assert.equal(f.saved[1].apnsEnvironment, 'sandbox'); assert.equal(f.saved[1].apnsTopic, 'com.shqingda.kaku.debug');
});
test('legacy registration requests prompt upgrading; legacy unregistration still targets only the owning session', async () => {
  const f = fixture();
  const response = await f.request('PUT', { platform: 'android', token: 'ExpoPushToken[old]' });
  assert.equal(response.status, 426);
  assert.equal((await response.json()).error, 'push_client_upgrade_required');
  assert.equal((await f.request('DELETE', { token: 'ExpoPushToken[old]' })).status, 200);
  assert.deepEqual(f.removed, [[42, 'session', 'ExpoPushToken[old]']]);
});
test('platform/provider mismatch, Expo token and unsafe topics are rejected without saving', async () => {
  const f = fixture();
  for (const body of [
    { platform: 'ios', provider: 'fcm', token: fcmToken },
    { platform: 'android', provider: 'fcm', token: 'ExpoPushToken[old]' },
    { platform: 'android', provider: 'fcm', token: 'x'.repeat(5000) },
    { platform: 'ios', provider: 'apns', token: 'ab'.repeat(32), apnsEnvironment: 'production', apnsTopic: 'com.other.app' },
    { platform: 'ios', provider: 'apns', token: 'ab'.repeat(32), apnsTopic: 'com.shqingda.kaku' },
  ]) assert.equal((await f.request('PUT', body)).status, 400);
  assert.equal(f.saved.length, 0);
});

test('missing provider secrets returns an explicit service failure before saving a native registration', async () => {
  let saves = 0;
  const app = createTestApp({ createStore: () => ({ authenticateSession: async () => ({ userId: 42, sessionId: 'session', user: { id: 42 } }) }),
    createPushDeviceStore: () => ({ save: async () => { saves++; return true; } }),
  });
  const response = await app.request('/me/push-devices', { method: 'PUT', headers,
    body: JSON.stringify({ platform: 'android', provider: 'fcm', token: fcmToken }) }, { DB: null });
  assert.equal(response.status, 503); assert.equal((await response.json()).error, 'push_provider_not_configured'); assert.equal(saves, 0);
});
