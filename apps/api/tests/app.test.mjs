import assert from 'node:assert/strict';
import test from 'node:test';

import { createApp } from '../src/app.ts';

test('health endpoint reports that the API is ready', async () => {
  const response = await createApp().request('/health');

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    service: 'kaku-api',
    status: 'ok',
  });
});

test('unknown endpoints return a stable JSON error', async () => {
  const response = await createApp().request('/missing');

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: 'not_found',
    message: '没有找到这个 API 路由。',
  });
});

test('episode comments are registered as an authenticated route', async () => {
  const response = await createApp({ createStore: () => ({}) }).request(
    '/me/episodes/987/comments',
    {
      body: JSON.stringify({
        content: '测试回复',
        turnstileToken: 'turnstile-token',
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    },
    { DB: {} },
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: 'unauthorized',
    message: '请先登录 Kaku。',
  });
});

test('review replies are registered as an authenticated route', async () => {
  const response = await createApp({ createStore: () => ({}) }).request(
    '/me/reviews/378109/replies',
    {
      body: JSON.stringify({
        content: '测试回复',
        turnstileToken: 'turnstile-token',
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    },
    { DB: {} },
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: 'unauthorized',
    message: '请先登录 Kaku。',
  });
});

test('notifications are registered as an authenticated route', async () => {
  const response = await createApp({ createStore: () => ({}) }).request(
    '/me/notifications',
    undefined,
    { DB: {} },
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    error: 'unauthorized',
    message: '请先登录 Kaku。',
  });
});
