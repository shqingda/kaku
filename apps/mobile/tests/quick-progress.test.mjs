import assert from 'node:assert/strict';
import test from 'node:test';
import { nextTrackingEpisode, applyQuickProgress } from '../src/features/home/quick-progress.ts';
const subject = { type: 2, totalEpisodes: 3, episodes: [1, 2, 3].map(number => ({ id: number, number, airDate: '2025-01-01' })) };
const collection = { collectionStatus: 'doing', watchedEpisodeNumbers: [1] };
test('selects the next main episode for anime and live action', () => {
  assert.equal(nextTrackingEpisode(subject, collection).number, 2);
  assert.equal(nextTrackingEpisode({ ...subject, type: 6 }, collection).number, 2);
});
test('does not guess for incomplete, special, offline or noncontiguous data', () => {
  for (const candidate of [
    { ...subject, type: 1 },
    { ...subject, offlineSource: 'pack' },
    { ...subject, totalEpisodes: 4 },
    { ...subject, episodes: [{ number: 0 }, { number: 1 }, { number: 2 }] },
  ]) assert.equal(nextTrackingEpisode(candidate, collection), null);
  assert.equal(nextTrackingEpisode(subject, { ...collection, watchedEpisodeNumbers: [1, 3] }), null);
  assert.equal(nextTrackingEpisode(subject, null), null);
});
test('does not offer unaired episodes or completed progress', () => {
  assert.equal(nextTrackingEpisode(subject, collection, '2024-01-01'), null);
  assert.equal(nextTrackingEpisode(subject, { ...collection, watchedEpisodeNumbers: [1, 2, 3] }), null);
});
test('marking the last episode never changes collection status', () => {
  assert.deepEqual(applyQuickProgress({ ...collection, watchedEpisodeNumbers: [1, 2] }, 3, false), { watchedEpisodeNumbers: [1, 2, 3] });
});
test('undo removes only the marked episode and preserves later progress', () => {
  assert.deepEqual(applyQuickProgress({ ...collection, watchedEpisodeNumbers: [1, 2, 3] }, 2, true), { watchedEpisodeNumbers: [1, 3] });
});
test('duplicate updates and changed collection status cannot overwrite progress', () => {
  assert.throws(() => applyQuickProgress(collection, 1, false));
  assert.throws(() => applyQuickProgress({ ...collection, collectionStatus: 'completed' }, 2, true));
});
