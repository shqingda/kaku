import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEpisodeRanges,
  getInitialEpisodeRangeIndex,
} from '../src/features/subject-detail/episode-ranges.ts';

test('long subjects are divided into manageable episode ranges', () => {
  const ranges = createEpisodeRanges(1155);

  assert.equal(ranges.length, 24);
  assert.deepEqual(ranges[0], { end: 50, start: 1 });
  assert.deepEqual(ranges.at(-1), { end: 1155, start: 1151 });
});

test('episode ranges open near the next unwatched episode', () => {
  assert.equal(getInitialEpisodeRangeIndex(1155, [1, 2]), 0);
  assert.equal(getInitialEpisodeRangeIndex(1155, [634]), 12);
  assert.equal(getInitialEpisodeRangeIndex(12, []), 0);
});
