import assert from 'node:assert/strict';
import test from 'node:test';

import { mergePersonalCollection } from '../src/features/collections/model.ts';

function previousCollection(overrides = {}) {
  return {
    collectionStatus: 'doing',
    comment: '原吐槽',
    isPrivate: false,
    rating: 8,
    subjectId: 1,
    tags: ['日常'],
    watchedEpisodeNumbers: [1, 2, 3],
    ...overrides,
  };
}

test('omitted update fields keep their previous values', () => {
  const merged = mergePersonalCollection(
    previousCollection(),
    { comment: '新吐槽' },
    1,
  );

  assert.equal(merged.collectionStatus, 'doing');
  assert.equal(merged.comment, '新吐槽');
  assert.equal(merged.rating, 8);
  assert.equal(merged.isPrivate, false);
  assert.deepEqual(merged.watchedEpisodeNumbers, [1, 2, 3]);
  assert.deepEqual(merged.tags, ['日常']);
});

test('a quiet edit that omits watched episodes does not wipe them', () => {
  const merged = mergePersonalCollection(
    previousCollection(),
    { isPrivate: true },
    1,
  );

  assert.deepEqual(merged.watchedEpisodeNumbers, [1, 2, 3]);
  assert.equal(merged.isPrivate, true);
});

test('changed status and rating replace the previous values', () => {
  const merged = mergePersonalCollection(
    previousCollection(),
    { collectionStatus: 'completed', rating: 10 },
    1,
  );

  assert.equal(merged.collectionStatus, 'completed');
  assert.equal(merged.rating, 10);
});

test('an update without cached collection falls back to empty defaults', () => {
  const merged = mergePersonalCollection(
    undefined,
    { collectionStatus: 'doing' },
    7,
  );

  assert.equal(merged.subjectId, 7);
  assert.equal(merged.collectionStatus, 'doing');
  assert.deepEqual(merged.watchedEpisodeNumbers, []);
  assert.deepEqual(merged.tags, []);
});

test('merging without any status drops the whole collection', () => {
  const merged = mergePersonalCollection(undefined, {}, 1);

  assert.equal(merged, null);
});
