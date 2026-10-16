import assert from 'node:assert/strict';
import test from 'node:test';
import { collectionBoxDraftFromForm, collectionBoxFormFromItem, collectionBoxUpdateFromDraft } from '../src/features/subject-detail/collection-box-draft.ts';
import { resizeWatchedEpisodes } from '../src/features/watching/progress.ts';

test('batch progress carries the original ID baseline even after another device refresh', () => {
  const original = { id: 42, title: '', coverUrl: '', episodeAirDates: [], totalEpisodes: 12, summary: '', year: 2026, collectionStatus: 'doing', watchedEpisodeNumbers: [1], watchedEpisodeIds: [101] };
  const form = collectionBoxFormFromItem(original);
  form.watchedCount = '3';
  const draft = collectionBoxDraftFromForm(form, original, true);
  const update = collectionBoxUpdateFromDraft(draft, { ...original, watchedEpisodeNumbers: [1, 5], watchedEpisodeIds: [101, 105] }, { supportsWatchProgress: true, supportsReadingProgress: false });
  assert.deepEqual(update.expectedWatchedEpisodeIds, [101]);
  assert.deepEqual(update.watchedEpisodeNumbers, [1, 2, 3]);
});

test('resizing progress preserves fractional episode identity instead of rounding it', () => {
  assert.deepEqual(resizeWatchedEpisodes([1, 1.5], 2, 12), [1, 1.5]);
  assert.deepEqual(resizeWatchedEpisodes([0.5, 1], 2, 12), [0.5, 1]);
  assert.deepEqual(resizeWatchedEpisodes([1, 1.5], 1, 12), [1]);
});

test('editing a comment preserves an unchanged count above the listed integer episode total', () => {
  const numbers = [1, 1.5, ...Array.from({ length: 11 }, (_, index) => index + 2)];
  const original = { id: 42, title: '', coverUrl: '', episodeAirDates: [], totalEpisodes: 12, summary: '', year: 2026, collectionStatus: 'doing', comment: 'old', watchedEpisodeNumbers: numbers, watchedEpisodeIds: numbers.map((_, index) => index + 101) };
  const form = collectionBoxFormFromItem(original);
  form.comment = 'new';
  const draft = collectionBoxDraftFromForm(form, original, true);
  const update = collectionBoxUpdateFromDraft(draft, original, { supportsWatchProgress: true, supportsReadingProgress: false });
  assert.equal(draft.watchedCount, 13);
  assert.equal(update.comment, 'new');
  assert.equal(update.watchedEpisodeNumbers, undefined);
  assert.equal(update.expectedWatchedEpisodeIds, undefined);
});

test('editing only a comment does not turn a background progress refresh into a batch overwrite', () => {
  const original = { id: 42, title: '', coverUrl: '', episodeAirDates: [], totalEpisodes: 12, summary: '', year: 2026, collectionStatus: 'doing', comment: 'old', watchedEpisodeNumbers: [1], watchedEpisodeIds: [101] };
  const form = collectionBoxFormFromItem(original);
  form.comment = 'new';
  const draft = collectionBoxDraftFromForm(form, original, true);
  const update = collectionBoxUpdateFromDraft(draft, { ...original, watchedEpisodeNumbers: [1, 5], watchedEpisodeIds: [101, 105] }, { supportsWatchProgress: true, supportsReadingProgress: false });
  assert.equal(update.comment, 'new');
  assert.equal(update.watchedEpisodeNumbers, undefined);
  assert.equal(update.expectedWatchedEpisodeIds, undefined);
});

test('a dirty comment cannot turn untouched personal fields into stale writes after refresh', () => {
  const original = { id: 42, title: '', coverUrl: '', episodeAirDates: [], totalEpisodes: 0, summary: '', year: 2026, collectionStatus: 'doing', comment: 'old', isPrivate: false, rating: 8, tags: ['a'], readChapterCount: 3, readVolumeCount: 1, watchedEpisodeNumbers: [], watchedEpisodeIds: [] };
  const form = collectionBoxFormFromItem(original);
  form.comment = 'new';
  const draft = collectionBoxDraftFromForm(form, original, false);
  const refreshed = { ...original, collectionStatus: 'completed', isPrivate: true, rating: 9, tags: ['b'], readChapterCount: 4 };
  const update = collectionBoxUpdateFromDraft(draft, refreshed, { supportsWatchProgress: false, supportsReadingProgress: true });
  assert.deepEqual(JSON.parse(JSON.stringify(update)), { comment: 'new' });
});

test('a missing original baseline cannot silently adopt refreshed IDs for a stale batch', () => {
  const original = { id: 42, title: '', coverUrl: '', episodeAirDates: [], totalEpisodes: 12, summary: '', year: 2026, collectionStatus: 'doing', watchedEpisodeNumbers: [1] };
  const form = collectionBoxFormFromItem(original);
  form.watchedCount = '3';
  const draft = collectionBoxDraftFromForm(form, original, true);
  const update = collectionBoxUpdateFromDraft(draft, { ...original, watchedEpisodeNumbers: [1, 5], watchedEpisodeIds: [101, 105] }, { supportsWatchProgress: true, supportsReadingProgress: false });
  assert.equal(update.expectedWatchedEpisodeIds, undefined);
});
