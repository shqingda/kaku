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
