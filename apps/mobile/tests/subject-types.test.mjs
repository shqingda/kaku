import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getCollectionStatusLabel,
  supportsWatchProgress,
  usesEpisodeData,
} from '../src/features/catalog/subject-types.ts';

test('collection labels follow each Bangumi subject type', () => {
  assert.equal(getCollectionStatusLabel(1, 'doing'), '在读');
  assert.equal(getCollectionStatusLabel(2, 'doing'), '在看');
  assert.equal(getCollectionStatusLabel(3, 'doing'), '在听');
  assert.equal(getCollectionStatusLabel(4, 'doing'), '在玩');
  assert.equal(getCollectionStatusLabel(6, 'doing'), '在看');
});

test('only watchable media exposes watched episode progress', () => {
  assert.equal(supportsWatchProgress(2), true);
  assert.equal(supportsWatchProgress(6), true);
  assert.equal(supportsWatchProgress(3), false);
  assert.equal(usesEpisodeData(3), true);
  assert.equal(usesEpisodeData(4), false);
});
