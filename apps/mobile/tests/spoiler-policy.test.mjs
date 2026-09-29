import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldHideEpisodeDiscussion } from '../src/features/discussions/spoiler-policy.ts';
test('spoiler protection is opt-in and only applies to unwatched progress-based subjects', () => {
  const base = { enabled: true, supportsProgress: true, watched: false, revealed: false };
  assert.equal(shouldHideEpisodeDiscussion(base), true);
  for (const change of [{ enabled: false }, { supportsProgress: false }, { watched: true }, { revealed: true }]) {
    assert.equal(shouldHideEpisodeDiscussion({ ...base, ...change }), false);
  }
});
