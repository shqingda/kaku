import assert from 'node:assert/strict';
import test from 'node:test';

import {
  anilistMediaTypeForSubject,
  catalogTitlesMatch,
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

test('catalog title matching ignores space and case', () => {
  assert.equal(catalogTitlesMatch('CLANNAD', 'clannad'), true);
  assert.equal(catalogTitlesMatch('After Story', 'AfterStory'), true);
  assert.equal(catalogTitlesMatch('CLANNAD', 'CLANNAD After Story'), false);
  assert.equal(anilistMediaTypeForSubject(2), 'ANIME');
  assert.equal(anilistMediaTypeForSubject(1), 'MANGA');
  assert.equal(anilistMediaTypeForSubject(4), null);
});
