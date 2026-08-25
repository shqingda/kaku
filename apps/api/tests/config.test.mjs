import assert from 'node:assert/strict';
import test from 'node:test';

import { createApp } from '../src/app.ts';

function appWithConfig(value) {
  return createApp({
    createConfigStore: () => ({
      async get() {
        if (value instanceof Error) throw value;
        return value;
      },
    }),
  });
}

test('public config returns a valid KV value with cache headers', async () => {
  const app = appWithConfig({
    features: { preferenceCloudSync: false },
    notice: '维护中',
    revision: 3,
  });
  const response = await app.request('/config');

  assert.equal(response.status, 200);
  assert.match(response.headers.get('Cache-Control'), /max-age=300/);
  assert.deepEqual(await response.json(), {
    config: {
      features: { preferenceCloudSync: false },
      notice: '维护中',
      revision: 3,
    },
    degraded: false,
    source: 'kv',
  });
});

test('public config uses safe defaults when KV has no value', async () => {
  const response = await appWithConfig(null).request('/config');

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    config: {
      features: { preferenceCloudSync: true },
      notice: null,
      revision: 0,
    },
    degraded: false,
    source: 'default',
  });
});

test('public config exposes degraded fallback when stored data is invalid', async () => {
  const response = await appWithConfig({ features: {} }).request('/config');

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.degraded, true);
  assert.equal(body.source, 'default');
  assert.equal(body.config.features.preferenceCloudSync, true);
});

test('public config remains available when KV reads fail', async () => {
  const response = await appWithConfig(new Error('KV unavailable')).request(
    '/config',
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.degraded, true);
  assert.equal(body.config.features.preferenceCloudSync, true);
});
