import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPreferencesBody, parseCloudPreferences } from '../src/infrastructure/kaku/preferences-client.ts';
import { KakuApiError } from '../src/infrastructure/kaku/auth-client.ts';

test('parseCloudPreferences reads the cloud theme and locale', async () => {
  const response = Response.json({
    preferences: {
      locale: 'zh',
      theme: 'dark',
      updatedAt: 1_785_940_000,
    },
  });

  const prefs = await parseCloudPreferences(response);

  assert.deepEqual(prefs, {
    locale: 'zh',
    theme: 'dark',
    updatedAt: 1_785_940_000,
  });
});

test('parseCloudPreferences accepts a null updatedAt', async () => {
  const response = Response.json({
    preferences: { locale: 'system', theme: 'light', updatedAt: null },
  });

  const prefs = await parseCloudPreferences(response);

  assert.deepEqual(prefs, {
    locale: 'system',
    theme: 'light',
    updatedAt: null,
  });
});

test('parseCloudPreferences throws KakuApiError for failed responses', async () => {
  const response = new Response(JSON.stringify({ message: '未登录' }), {
    status: 401,
  });

  await assert.rejects(
    () => parseCloudPreferences(response),
    (error) => {
      assert.ok(error instanceof KakuApiError);
      assert.equal(error.status, 401);
      assert.equal(error.message, '未登录');
      return true;
    },
  );
});

test('parseCloudPreferences rejects unknown theme values', async () => {
  const response = Response.json({
    preferences: { locale: 'system', theme: 'sepia', updatedAt: 1 },
  });

  await assert.rejects(() => parseCloudPreferences(response));
});

test('buildPreferencesBody serializes only the theme', () => {
  assert.equal(
    buildPreferencesBody('dark'),
    JSON.stringify({ theme: 'dark' }),
  );
});
