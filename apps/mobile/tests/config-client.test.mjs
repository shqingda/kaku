import assert from 'node:assert/strict';
import test from 'node:test';

import { getPublicConfig } from '../src/infrastructure/kaku/config-client.ts';
import { KakuApiError } from '../src/infrastructure/kaku/auth-client.ts';

function stubFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ init, url: String(url) });
    return handler();
  };
  return calls;
}

test('getPublicConfig requests /config and parses the payload', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const calls = stubFetch(() =>
    Response.json({
      config: {
        features: { preferenceCloudSync: true },
        notice: '服务将于今晚维护',
        revision: 7,
      },
      degraded: false,
      source: 'kv',
    }),
  );

  const config = await getPublicConfig();

  assert.equal(calls.length, 1);
  const url = new URL(calls[0].url);
  assert.equal(url.pathname, '/config');
  assert.deepEqual(config, {
    config: {
      features: { preferenceCloudSync: true },
      notice: '服务将于今晚维护',
      revision: 7,
    },
    degraded: false,
    source: 'kv',
  });
});

test('getPublicConfig accepts the default source and a null notice', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  stubFetch(() =>
    Response.json({
      config: {
        features: { preferenceCloudSync: false },
        notice: null,
        revision: 0,
      },
      degraded: true,
      source: 'default',
    }),
  );

  const config = await getPublicConfig();

  assert.equal(config.degraded, true);
  assert.equal(config.source, 'default');
  assert.equal(config.config.notice, null);
});

test('getPublicConfig throws KakuApiError with the server message', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  stubFetch(
    () =>
      new Response(JSON.stringify({ message: '配置服务不可用' }), { status: 503 }),
  );

  await assert.rejects(
    () => getPublicConfig(),
    (error) => {
      assert.ok(error instanceof KakuApiError);
      assert.equal(error.status, 503);
      assert.equal(error.message, '配置服务不可用');
      return true;
    },
  );
});

test('getPublicConfig forwards the abort signal', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  let receivedSignal;
  globalThis.fetch = async (_url, init) => {
    receivedSignal = init.signal;
    return Response.json({
      config: { features: { preferenceCloudSync: false }, notice: null, revision: 0 },
      degraded: false,
      source: 'default',
    });
  };
  const controller = new AbortController();

  await getPublicConfig(controller.signal);

  assert.equal(receivedSignal, controller.signal);
});
