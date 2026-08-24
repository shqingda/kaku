import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_APP_PREFERENCES,
  mergePreferences,
  parseAppPreferences,
  resolveTheme,
} from '../src/features/preferences/preferences-model.ts';

test('parseAppPreferences returns defaults for garbage input', () => {
  assert.deepEqual(parseAppPreferences(null), DEFAULT_APP_PREFERENCES);
  assert.deepEqual(parseAppPreferences(undefined), DEFAULT_APP_PREFERENCES);
  assert.deepEqual(parseAppPreferences('dark'), DEFAULT_APP_PREFERENCES);
  assert.deepEqual(parseAppPreferences({ theme: 'neon' }), {
    theme: 'system',
    updatedAt: null,
  });
});

test('parseAppPreferences keeps valid values and drops bad timestamps', () => {
  assert.deepEqual(parseAppPreferences({ theme: 'dark', updatedAt: 12 }), {
    theme: 'dark',
    updatedAt: 12,
  });
  assert.deepEqual(parseAppPreferences({ theme: 'light', updatedAt: -1 }), {
    theme: 'light',
    updatedAt: null,
  });
});

test('resolveTheme follows the system scheme only in system mode', () => {
  assert.equal(resolveTheme('system', 'dark'), 'dark');
  assert.equal(resolveTheme('system', 'light'), 'light');
  assert.equal(resolveTheme('system', null), 'light');
  assert.equal(resolveTheme('dark', 'light'), 'dark');
  assert.equal(resolveTheme('light', 'dark'), 'light');
});

test('mergePreferences keeps fresh local values and pushes them to the cloud', () => {
  const local = { theme: 'dark', updatedAt: 200 };
  const result = mergePreferences(local, {
    locale: 'system',
    theme: 'light',
    updatedAt: 100,
  });

  assert.deepEqual(result.applied, local);
  assert.equal(result.pushToCloud, true);
});

test('mergePreferences adopts newer cloud values without pushing back', () => {
  const result = mergePreferences(
    { theme: 'system', updatedAt: 100 },
    { locale: 'zh', theme: 'dark', updatedAt: 200 },
  );

  assert.deepEqual(result.applied, { theme: 'dark', updatedAt: 200 });
  assert.equal(result.pushToCloud, false);
});

test('mergePreferences treats an empty local record as older than any cloud record', () => {
  const result = mergePreferences(
    { theme: 'system', updatedAt: null },
    { locale: 'system', theme: 'light', updatedAt: 10 },
  );

  assert.deepEqual(result.applied, { theme: 'light', updatedAt: 10 });
  assert.equal(result.pushToCloud, false);
});

test('mergePreferences pushes an untouched local record only when the cloud saved one', () => {
  const untouched = { theme: 'system', updatedAt: null };
  assert.deepEqual(mergePreferences(untouched, null), {
    applied: untouched,
    pushToCloud: false,
  });

  const touched = { theme: 'dark', updatedAt: 5 };
  assert.deepEqual(mergePreferences(touched, null), {
    applied: touched,
    pushToCloud: true,
  });
});

test('mergePreferences stays quiet when both records share the same timestamp', () => {
  const result = mergePreferences(
    { theme: 'light', updatedAt: 100 },
    { locale: 'system', theme: 'light', updatedAt: 100 },
  );

  assert.deepEqual(result.applied, { theme: 'light', updatedAt: 100 });
  assert.equal(result.pushToCloud, false);
});
