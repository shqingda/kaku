import assert from 'node:assert/strict';
import test from 'node:test';

import {
  KakuApiError,
  exchangeHandoffCode,
  fetchKaku,
  fetchPublicKaku,
  getAppCallbackUrl,
  getBangumiLoginUrl,
  parseDeviceSessions,
  readErrorMessage,
  refreshAuthSession,
} from '../src/infrastructure/kaku/auth-client.ts';

const KAKU_API_URL = 'https://kaku-api.shqingda.workers.dev';

const session = {
  expiresAt: 1_786_940_000,
  refreshExpiresAt: 1_796_940_000,
  refreshToken: 'refresh-token-0123456789abcdef',
  sessionId: 'session-1',
  sessionToken: 'session-token-0123456789abcdef',
  user: { id: 5, nickname: '魂', username: 'soul' },
};

function stubFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ init, url: String(url) });
    return handler();
  };
  return calls;
}

test('readErrorMessage reads the message field', async () => {
  const response = new Response(JSON.stringify({ message: '登录已过期' }), {
    status: 401,
  });

  assert.equal(await readErrorMessage(response), '登录已过期');
});

test('readErrorMessage falls back to the status', async () => {
  const response = new Response('not json', { status: 503 });

  assert.equal(await readErrorMessage(response), 'Kaku 服务返回了 503');
});

test('getBangumiLoginUrl points at the hosted callback', () => {
  const url = new URL(getBangumiLoginUrl());

  assert.equal(url.origin, 'https://kaku-api.shqingda.workers.dev');
  assert.equal(url.pathname, '/auth/bangumi/start');
  assert.equal(url.searchParams.get('app_redirect_uri'), 'kaku://auth/callback');
});

test('getAppCallbackUrl returns the deep link', () => {
  assert.equal(getAppCallbackUrl(), 'kaku://auth/callback');
});

test('KakuApiError carries the status', () => {
  const error = new KakuApiError('nope', 429);

  assert.equal(error.name, 'KakuApiError');
  assert.equal(error.status, 429);
  assert.equal(error.message, 'nope');
});

test('exchangeHandoffCode posts the code to /auth/session and parses the session', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const calls = stubFetch(() => Response.json(session));

  const parsed = await exchangeHandoffCode('handoff-code-0123456789', 'Pixel 8');

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${KAKU_API_URL}/auth/session`);
  assert.equal(calls[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    code: 'handoff-code-0123456789',
    deviceName: 'Pixel 8',
  });
  assert.equal(calls[0].init.headers['Content-Type'], 'application/json');
  assert.ok(calls[0].init.signal instanceof AbortSignal);
  assert.deepEqual(parsed, session);
});

test('exchangeHandoffCode throws KakuApiError with the server message', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  stubFetch(
    () => new Response(JSON.stringify({ message: '交接码已失效' }), { status: 400 }),
  );

  await assert.rejects(
    () => exchangeHandoffCode('bad-code', 'Pixel 8'),
    (error) => {
      assert.ok(error instanceof KakuApiError);
      assert.equal(error.status, 400);
      assert.equal(error.message, '交接码已失效');
      return true;
    },
  );
});

test('refreshAuthSession posts the refresh token to /auth/session/refresh', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const calls = stubFetch(() => Response.json(session));

  const parsed = await refreshAuthSession('refresh-token-0123456789abcdef');

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${KAKU_API_URL}/auth/session/refresh`);
  assert.equal(calls[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    refreshToken: 'refresh-token-0123456789abcdef',
  });
  assert.deepEqual(parsed, session);
});

test('refreshAuthSession throws KakuApiError when the refresh token is stale', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  stubFetch(
    () => new Response(JSON.stringify({ message: '登录已过期' }), { status: 401 }),
  );

  await assert.rejects(() => refreshAuthSession('stale-token-0123456789'), {
    name: 'KakuApiError',
    status: 401,
    message: '登录已过期',
  });
});

test('fetchKaku prefixes the base URL and attaches the bearer token', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const calls = stubFetch(() => Response.json({ ok: true }));

  await fetchKaku('/me/timeline', 'token-1', { signal: undefined });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${KAKU_API_URL}/me/timeline`);
  assert.ok(calls[0].init.headers instanceof Headers);
  assert.equal(calls[0].init.headers.get('Authorization'), 'Bearer token-1');
  assert.ok(calls[0].init.signal instanceof AbortSignal);
});

test('fetchKaku keeps existing headers and passes the abort signal through', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const calls = stubFetch(() => Response.json({ ok: true }));
  const controller = new AbortController();

  await fetchKaku('/me/timeline', 'token-1', {
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    signal: controller.signal,
  });

  const headers = calls[0].init.headers;
  assert.equal(headers.get('Authorization'), 'Bearer token-1');
  assert.equal(headers.get('Content-Type'), 'application/json');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.signal, controller.signal);
});

test('fetchPublicKaku requests the path without auth and times out by default', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const calls = stubFetch(() => Response.json({ ok: true }));

  await fetchPublicKaku('/public/blogs?page=1');

  assert.equal(calls[0].url, `${KAKU_API_URL}/public/blogs?page=1`);
  assert.equal(calls[0].init.headers, undefined);
  assert.ok(calls[0].init.signal instanceof AbortSignal);
});

test('parseDeviceSessions validates the sessions payload', async () => {
  const now = 1_785_940_000;
  const response = Response.json({
    sessions: [
      {
        createdAt: now,
        current: true,
        deviceName: 'Pixel 8',
        expiresAt: now + 1000,
        lastUsedAt: now,
        sessionId: 'session-1',
      },
    ],
  });

  const sessions = await parseDeviceSessions(response);

  assert.deepEqual(sessions, [
    {
      createdAt: now,
      current: true,
      deviceName: 'Pixel 8',
      expiresAt: now + 1000,
      lastUsedAt: now,
      sessionId: 'session-1',
    },
  ]);
});

test('parseDeviceSessions throws KakuApiError for failed responses', async () => {
  const response = new Response(JSON.stringify({ message: '登录已过期' }), {
    status: 401,
  });

  await assert.rejects(() => parseDeviceSessions(response), (error) => {
    assert.ok(error instanceof KakuApiError);
    assert.equal(error.status, 401);
    assert.equal(error.message, '登录已过期');
    return true;
  });
});
