import assert from 'node:assert/strict';
import test from 'node:test';

import {
  registerPushDevice,
  unregisterPushDevice,
} from '../src/infrastructure/kaku/push-client.ts';
import { KakuApiError } from '../src/infrastructure/kaku/auth-client.ts';

test('registerPushDevice puts the platform and token', async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return new Response(null, { status: 200 });
  };

  await registerPushDevice(request, {
    platform: 'android',
    token: 'fcm-token-1',
  });

  assert.deepEqual(calls, [
    {
      path: '/me/push-devices',
      init: {
        body: JSON.stringify({ platform: 'android', token: 'fcm-token-1' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PUT',
      },
    },
  ]);
});

test('registerPushDevice throws KakuApiError with the server message', async () => {
  const request = async () =>
    new Response(JSON.stringify({ message: '设备注册失败' }), { status: 500 });

  await assert.rejects(
    () => registerPushDevice(request, { platform: 'ios', token: 'apns' }),
    (error) => {
      assert.ok(error instanceof KakuApiError);
      assert.equal(error.status, 500);
      assert.equal(error.message, '设备注册失败');
      return true;
    },
  );
});

test('unregisterPushDevice sends DELETE', async () => {
  const calls = [];
  const request = async (path, init) => {
    calls.push({ path, init });
    return new Response(null, { status: 204 });
  };

  await unregisterPushDevice(request);

  assert.deepEqual(calls, [
    { path: '/me/push-devices', init: { method: 'DELETE' } },
  ]);
});

test('unregisterPushDevice throws KakuApiError on failure', async () => {
  const request = async () => new Response('boom', { status: 502 });

  await assert.rejects(() => unregisterPushDevice(request), {
    name: 'KakuApiError',
    status: 502,
    message: 'Kaku 服务返回了 502',
  });
});
