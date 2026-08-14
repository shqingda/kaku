import assert from 'node:assert/strict';
import test from 'node:test';

import {
  KakuApiError,
  getAppCallbackUrl,
  getBangumiLoginUrl,
  readErrorMessage,
} from '../src/infrastructure/kaku/auth-client.ts';

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
