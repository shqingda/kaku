import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_APP_PREFERENCES,
  mergePreferences,
  parseAppPreferences,
  resolveTheme,
} from '../src/features/preferences/preferences-model.ts';

function localPrefs(theme, updatedAt, syncEnabled = true) {
  return { theme, updatedAt, syncEnabled };
}

test('parseAppPreferences returns defaults for garbage input', () => {
  assert.deepEqual(parseAppPreferences(null), DEFAULT_APP_PREFERENCES);
  assert.deepEqual(parseAppPreferences(undefined), DEFAULT_APP_PREFERENCES);
  assert.deepEqual(parseAppPreferences('dark'), DEFAULT_APP_PREFERENCES);
  assert.deepEqual(parseAppPreferences({ theme: 'neon' }), {
    theme: 'system',
    updatedAt: null,
    syncEnabled: true,
  });
});

test('parseAppPreferences keeps valid values and drops bad timestamps', () => {
  assert.deepEqual(parseAppPreferences({ theme: 'dark', updatedAt: 12 }), {
    theme: 'dark',
    updatedAt: 12,
    syncEnabled: true,
  });
  assert.deepEqual(parseAppPreferences({ theme: 'light', updatedAt: -1 }), {
    theme: 'light',
    updatedAt: null,
    syncEnabled: true,
  });
});

test('parseAppPreferences preserves an explicit sync flag and resumes stale records', () => {
  assert.deepEqual(
    parseAppPreferences({ theme: 'dark', updatedAt: 7, syncEnabled: false }),
    { theme: 'dark', updatedAt: 7, syncEnabled: false },
  );
});

test('resolveTheme follows the system scheme only in system mode', () => {
  assert.equal(resolveTheme('system', 'dark'), 'dark');
  assert.equal(resolveTheme('system', 'light'), 'light');
  assert.equal(resolveTheme('system', null), 'light');
  assert.equal(resolveTheme('dark', 'light'), 'dark');
  assert.equal(resolveTheme('light', 'dark'), 'light');
});

test('mergePreferences keeps fresh local values and pushes them to the cloud', () => {
  const local = localPrefs('dark', 200);
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
    localPrefs('system', 100),
    { locale: 'zh', theme: 'dark', updatedAt: 200 },
  );

  assert.deepEqual(result.applied, localPrefs('dark', 200));
  assert.equal(result.pushToCloud, false);
});

test('mergePreferences treats an empty local record as older than any cloud record', () => {
  const result = mergePreferences(
    localPrefs('system', null),
    { locale: 'system', theme: 'light', updatedAt: 10 },
  );

  assert.deepEqual(result.applied, localPrefs('light', 10));
  assert.equal(result.pushToCloud, false);
});

test('mergePreferences pushes an untouched local record only when the cloud saved one', () => {
  const untouched = localPrefs('system', null);
  assert.deepEqual(mergePreferences(untouched, null), {
    applied: untouched,
    pushToCloud: false,
  });

  const touched = localPrefs('dark', 5);
  assert.deepEqual(mergePreferences(touched, null), {
    applied: touched,
    pushToCloud: true,
  });
});

test('mergePreferences stays quiet when both records share the same timestamp', () => {
  const result = mergePreferences(
    localPrefs('light', 100),
    { locale: 'system', theme: 'light', updatedAt: 100 },
  );

  assert.deepEqual(result.applied, localPrefs('light', 100));
  assert.equal(result.pushToCloud, false);
});

test('mergePreferences keeps the device-level sync flag when adopting cloud values', () => {
  const result = mergePreferences(
    localPrefs('system', 0, false),
    { locale: 'system', theme: 'dark', updatedAt: 300 },
  );

  assert.deepEqual(result.applied, localPrefs('dark', 300, false));
  assert.equal(result.pushToCloud, false);
});
