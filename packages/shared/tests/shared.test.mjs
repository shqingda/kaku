import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COLLECTION_STATUSES,
  DEFAULT_PREFERENCE_VALUES,
  LOCALE_PREFERENCES,
  THEME_PREFERENCES,
  isCollectionStatus,
  isLocalePreference,
  isThemePreference,
} from '../src/index.ts';

test('preference defaults stay on the system option', () => {
  assert.deepEqual(DEFAULT_PREFERENCE_VALUES, {
    locale: 'system',
    theme: 'system',
  });
  assert.equal(isThemePreference(DEFAULT_PREFERENCE_VALUES.theme), true);
  assert.equal(isLocalePreference(DEFAULT_PREFERENCE_VALUES.locale), true);
});

test('preference guards accept only declared values', () => {
  assert.deepEqual([...THEME_PREFERENCES], ['system', 'light', 'dark']);
  assert.deepEqual([...LOCALE_PREFERENCES], ['system', 'zh', 'en']);

  for (const theme of THEME_PREFERENCES) {
    assert.equal(isThemePreference(theme), true, theme);
  }
  for (const locale of LOCALE_PREFERENCES) {
    assert.equal(isLocalePreference(locale), true, locale);
  }

  for (const value of ['black', 'Dark', '', ' ', undefined, null, 1, {}, []]) {
    assert.equal(isThemePreference(value), false, String(value));
  }
  for (const value of ['jp', 'ja', 'ZH', 'en-US', 1, false, undefined]) {
    assert.equal(isLocalePreference(value), false, String(value));
  }
});

test('collection status guard accepts the five Bangumi statuses and rejects others', () => {
  assert.deepEqual([...COLLECTION_STATUSES], [
    'wish',
    'completed',
    'doing',
    'onHold',
    'dropped',
  ]);
  for (const status of COLLECTION_STATUSES) {
    assert.equal(isCollectionStatus(status), true, status);
  }
  for (const value of [
    'watching',
    'on-hold',
    'on_hold',
    'DOING',
    'collect',
    '',
    null,
    3,
    undefined,
  ]) {
    assert.equal(isCollectionStatus(value), false, String(value));
  }
});
