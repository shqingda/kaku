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

test('a revoked registration after OAuth refresh is never sent to FCM', async () => {
  let active = true, sends = 0;
  const client = createFcmClient(account, async url => {
    if (String(url).includes('oauth2')) { active = false; return Response.json({ access_token: 'test', expires_in: 3600 }); }
    sends++; return Response.json({ name: 'projects/kaku-test/messages/id' });
  }, () => now);
  assert.equal((await client.send('native-token', payload, async () => active)).status, 'failed');
  assert.equal(sends, 0);
});

test('credentials cannot redirect private JWTs to an arbitrary token endpoint', async () => {
  const config = JSON.parse(account); config.token_uri = 'https://attacker.invalid/token';
  const urls = [];
  const client = createFcmClient(JSON.stringify(config), async url => {
    urls.push(String(url)); return String(url).includes('oauth2')
      ? Response.json({ access_token: 'test', expires_in: 3600 })
      : Response.json({ name: 'projects/kaku-test/messages/id' });
  }, () => now);
  await client.send('native-token', payload);
  assert.ok(urls.every(url => url.startsWith('https://oauth2.googleapis.com/') || url.startsWith('https://fcm.googleapis.com/')));
});

test('OAuth refresh failure can recover, expired credentials refresh, and APNs tokens stay cached', async () => {
  let clock = now, oauth = 0, appleTokens = [];
  const client = createFcmClient(account, async url => {
    if (String(url).includes('oauth2')) {
      oauth++;
      return oauth === 1 ? Response.json({}, { status: 503 }) : Response.json({ access_token: 'test', expires_in: 3600 });
    }
    return Response.json({ name: 'projects/kaku-test/messages/id' });
  }, () => clock);
  assert.equal((await client.send('token', payload)).status, 'failed');
  assert.equal((await client.send('token', payload)).status, 'accepted');
  clock += 3_600_000;
  assert.equal((await client.send('token', payload)).status, 'accepted');
  assert.equal(oauth, 3);
  const apns = createApnsClient(apple, async (_url, init) => { appleTokens.push(init.headers.authorization); return new Response(null); }, () => clock);
  const target = { environment: 'sandbox', topic: 'com.shqingda.kaku.debug', registeredAt: now };
  await apns.send('ab'.repeat(32), payload, target); clock += 15 * 60_000;
  await apns.send('ab'.repeat(32), payload, target);
  assert.equal(appleTokens[0], appleTokens[1]);
  clock += 40 * 60_000; await apns.send('ab'.repeat(32), payload, target);
  assert.notEqual(appleTokens[1], appleTokens[2]);
});

test('native provider requests have twelve-second deadlines and do not follow redirects', async t => {
  const original = AbortSignal.timeout, deadlines = [];
  t.mock.method(AbortSignal, 'timeout', milliseconds => { deadlines.push(milliseconds); return original(5); });
  const fetcher = async (_url, init) => {
    assert.equal(init.redirect, 'error');
    return new Promise((_, reject) => {
      const timer = setTimeout(() => reject(new Error('deadline not enforced')), 500);
      init.signal.addEventListener('abort', () => { clearTimeout(timer); reject(init.signal.reason); }, { once: true });
    });
  };
  assert.equal((await createFcmClient(account, fetcher, () => now).send('token', payload)).status, 'failed');
  assert.equal((await createApnsClient(apple, fetcher, () => now).send('ab'.repeat(32), payload, { environment: 'sandbox', topic: 'com.shqingda.kaku.debug', registeredAt: now })).status, 'failed');
  assert.deepEqual(deadlines, [12000, 12000]);
});

test('native sender routes both platforms and preserves per-environment auth cache without Expo', async () => {
  const { nativePushSender } = await import('../src/push/native-sender.ts');
  const env = { FCM_SERVICE_ACCOUNT_JSON: account, APNS_KEY_ID: apple.keyId, APNS_TEAM_ID: apple.teamId, APNS_PRIVATE_KEY: apple.privateKey };
  const urls = [];
  const fetcher = async url => {
    urls.push(String(url));
    if (String(url).includes('oauth2')) return Response.json({ access_token: 'test', expires_in: 3600 });
    if (String(url).includes('fcm.googleapis')) return Response.json({ name: 'projects/kaku-test/messages/id' });
    return new Response(null, { status: 200 });
  };
  const sender = nativePushSender(env, fetcher, () => now);
  assert.equal(sender, nativePushSender(env, fetcher, () => now));
  assert.equal((await sender({ provider: 'fcm', platform: 'android', token: 'fcm-native-token-1234567890' }, payload, async () => true)).status, 'accepted');
  assert.equal((await sender({ provider: 'apns', platform: 'ios', token: 'ab'.repeat(32), apnsEnvironment: 'sandbox', apnsTopic: 'com.shqingda.kaku.debug', updatedAt: now }, payload, async () => true)).status, 'accepted');
  assert.equal((await sender({ provider: 'expo', platform: 'android', token: 'ExpoPushToken[old]' }, payload, async () => true)).status, 'failed');
  assert.equal(urls.length, 3); assert.ok(urls.some(url => url.includes('api.sandbox.push.apple.com')));
});
