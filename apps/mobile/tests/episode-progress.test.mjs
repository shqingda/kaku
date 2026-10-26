import assert from 'node:assert/strict';
import test from 'node:test';

import { episodeProgressUpdate } from '../src/features/discussions/episode-progress.ts';

test('marking an episode starts watching from no status or wish', () => {
  for (const status of [undefined, null, 'wish']) {
    assert.deepEqual(episodeProgressUpdate(status, 7, true), {
      collectionStatus: 'doing',
      episodeChanges: [{ episodeId: 7, watched: true }],
    });
  }
});

test('an unchanged status is left out so Bangumi writes no timeline event', () => {
  for (const status of ['doing', 'completed', 'onHold', 'dropped']) {
    assert.deepEqual(episodeProgressUpdate(status, 7, false), {
      episodeChanges: [{ episodeId: 7, watched: false }],
    });
  }
});
