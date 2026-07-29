import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decodeWatchingItems,
  encodeWatchingItems,
} from '../src/features/watching/watching-storage-codec.ts';

const item = {
  coverUrl: 'https://example.com/cover.jpg',
  episodeAirDates: ['2026-01-01'],
  id: 1,
  summary: '简介',
  title: '测试动画',
  totalEpisodes: 12,
  watchedEpisodeNumbers: [1, 3],
  year: 2026,
};

test('watching storage codec round-trips valid items', () => {
  assert.deepEqual(decodeWatchingItems(encodeWatchingItems([item])), [
    { ...item, collectionStatus: 'doing' },
  ]);
});

test('watching storage keeps collection status and rating independent', () => {
  const stored = {
    ...item,
    collectionStatus: 'wish',
    rating: 9,
    watchedEpisodeNumbers: [],
  };

  assert.deepEqual(decodeWatchingItems(encodeWatchingItems([stored])), [
    stored,
  ]);
});

test('watching storage preserves an explicit uncollected status', () => {
  const stored = {
    ...item,
    collectionStatus: null,
  };

  assert.deepEqual(decodeWatchingItems(encodeWatchingItems([stored])), [
    stored,
  ]);
});

test('watching storage codec rejects malformed JSON', () => {
  assert.throws(() => decodeWatchingItems('{not json'));
});

test('watching storage codec rejects invalid persisted data', () => {
  assert.throws(() =>
    decodeWatchingItems(
      JSON.stringify([{ ...item, watchedEpisodeNumbers: [0, 99.5] }]),
    ),
  );
});
