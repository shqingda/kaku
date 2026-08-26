import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COLLECTION_STATUSES,
  DEFAULT_PREFERENCE_VALUES,
  isCollectionStatus,
  isLocalePreference,
  isThemePreference,
} from '../src/index.ts';

test('preference defaults stay on the system option', () => {
  assert.deepEqual(DEFAULT_PREFERENCE_VALUES, {
    locale: 'system',
    theme: 'system',
  });
});

test('theme, locale, and collection status guards reject unknown values', () => {
  assert.equal(isThemePreference('dark'), true);
  assert.equal(isThemePreference('neon'), false);
  assert.equal(isLocalePreference('zh'), true);
  assert.equal(isLocalePreference('ja'), false);
  assert.equal(isCollectionStatus('doing'), true);
  assert.equal(isCollectionStatus('watching'), false);
  assert.deepEqual([...COLLECTION_STATUSES], [
    'wish',
    'completed',
    'doing',
    'onHold',
    'dropped',
  ]);
});
