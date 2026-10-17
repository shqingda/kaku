import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { createFcmClient } from '../src/push/fcm-client.ts';
import { createApnsClient } from '../src/push/apns-client.ts';

const now = 1_800_000_000_000;
const payload = { body: '新消息', title: 'Kaku', unreadCount: 2 };
let rsa, ec, account, apple;
const pem = (bytes) => `-----BEGIN PRIVATE KEY-----\n${Buffer.from(bytes).toString('base64')}\n-----END PRIVATE KEY-----`;
before(async () => {
  rsa = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  ec = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  account = JSON.stringify({ type: 'service_account', project_id: 'kaku-test', client_email: 'test@kaku-test.iam.gserviceaccount.com', private_key: pem(await crypto.subtle.exportKey('pkcs8', rsa.privateKey)) });
  apple = { keyId: 'ABCDEFGHIJ', teamId: '1234567890', privateKey: pem(await crypto.subtle.exportKey('pkcs8', ec.privateKey)) };
});
async function checkJwt(jwt, key, algorithm) {
  const [header, body, signature] = jwt.split('.');
  assert.equal(await crypto.subtle.verify(algorithm, key, Buffer.from(signature, 'base64url'), new TextEncoder().encode(`${header}.${body}`)), true);
  return { header: JSON.parse(Buffer.from(header, 'base64url')), body: JSON.parse(Buffer.from(body, 'base64url')) };
}

test('FCM uses a signed, scoped OAuth assertion, shares token refresh and routes notification taps', async () => {
  let oauth = 0, sends = 0;
  const client = createFcmClient(account, async (url, init) => {
    assert.ok(init.signal instanceof AbortSignal);
    if (String(url) === 'https://oauth2.googleapis.com/token') {
      oauth++;
      const jwt = await checkJwt(new URLSearchParams(init.body).get('assertion'), rsa.publicKey, 'RSASSA-PKCS1-v1_5');
      assert.equal(jwt.header.alg, 'RS256');
      assert.equal(jwt.body.scope, 'https://www.googleapis.com/auth/firebase.messaging');
      assert.equal(jwt.body.aud, String(url));
      assert.equal(jwt.body.exp - jwt.body.iat, 3600);
      return Response.json({ access_token: 'scoped-access', expires_in: 3600, token_type: 'Bearer' });
    }
    assert.equal(String(url), 'https://fcm.googleapis.com/v1/projects/kaku-test/messages:send');
    assert.equal(init.headers.Authorization, 'Bearer scoped-access');
    const message = JSON.parse(init.body).message;
    assert.equal(message.data.href, '/notifications');
    assert.equal(message.android.notification.channel_id, 'kaku-default');
    assert.deepEqual(message.notification, { body: payload.body, title: payload.title });
    sends++;
    return Response.json({ name: `projects/kaku-test/messages/${sends}` });
  }, () => now);
  await Promise.all(['one', 'two'].map(token => client.send(token, payload)));
  assert.equal(oauth, 1);
  assert.equal(sends, 2);
});

test('FCM only UNREGISTERED invalidates a device; malformed success, bad payload and credentials remain failures', async () => {
  for (const [status, body, expected] of [
    [404, { error: { details: [{ '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode: 'UNREGISTERED' }] } }, 'invalid'],
    [400, { error: { details: [{ '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode: 'INVALID_ARGUMENT' }] } }, 'failed'],
    [403, { error: { status: 'PERMISSION_DENIED' } }, 'failed'],
    [429, {}, 'failed'], [503, {}, 'failed'], [200, {}, 'failed'],
  ]) {
    const client = createFcmClient(account, async url => String(url).includes('oauth2')
      ? Response.json({ access_token: 'test', expires_in: 3600 })
      : Response.json(body, { status }), () => now);
    assert.equal((await client.send('device', payload)).status, expected);
  }
});

test('APNs signs ES256 and uses environment, topic, alerts and tap data', async () => {
  for (const environment of ['sandbox', 'production']) {
    const client = createApnsClient(apple, async (url, init) => {
      const jwt = await checkJwt(init.headers.authorization.slice(7), ec.publicKey, { name: 'ECDSA', hash: 'SHA-256' });
      assert.equal(jwt.header.alg, 'ES256'); assert.equal(jwt.header.kid, apple.keyId);
      assert.equal(jwt.body.iss, apple.teamId); assert.equal(jwt.body.iat, now / 1000);
      assert.equal(new URL(url).hostname, environment === 'sandbox' ? 'api.sandbox.push.apple.com' : 'api.push.apple.com');
      assert.equal(init.headers['apns-topic'], 'com.shqingda.kaku');
      assert.equal(init.headers['apns-push-type'], 'alert');
      const body = JSON.parse(init.body);
      assert.equal(body.href, '/notifications'); assert.equal(body.aps.badge, 2);
      return new Response(null, { status: 200 });
    }, () => now);
    assert.equal((await client.send('ab'.repeat(32), payload, { environment, topic: 'com.shqingda.kaku', registeredAt: now - 1000 })).status, 'accepted');
  }
});

test('APNs only invalidates Unregistered tokens when its timestamp covers the registration', async () => {
  for (const [status, reason, timestamp, expected] of [
    [410, 'Unregistered', now - 1, 'failed'], [410, 'Unregistered', now, 'invalid'],
    [400, 'BadDeviceToken', undefined, 'failed'], [400, 'DeviceTokenNotForTopic', undefined, 'failed'],
    [403, 'InvalidProviderToken', undefined, 'failed'], [503, 'ServiceUnavailable', undefined, 'failed'],
  ]) {
    const client = createApnsClient(apple, async () => Response.json({ reason, timestamp }, { status }), () => now);
    assert.equal((await client.send('ab'.repeat(32), payload, { environment: 'production', topic: 'com.shqingda.kaku', registeredAt: now })).status, expected);
  }
});
