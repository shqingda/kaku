import assert from 'node:assert/strict';
import test from 'node:test';

import {
  collectionBoxBaselineFromItem,
  collectionBoxDraftFromForm,
  collectionBoxFormFromItem,
  isCollectionBoxFormDirty,
} from '../src/features/subject-detail/collection-box-draft.ts';

function watchingItem(overrides = {}) {
  return {
    coverUrl: '',
    episodeAirDates: [],
    id: 1,
    summary: '',
    title: '测试条目',
    totalEpisodes: 12,
    type: 2,
    watchedEpisodeNumbers: [1, 2, 3],
    year: 2024,
    ...overrides,
  };
}

test('opening the collection box copies the current item into one form', () => {
  const item = watchingItem({
    collectionStatus: 'doing',
    comment: '不错',
    isPrivate: true,
    rating: 8,
    tags: ['日常'],
  });
  const form = collectionBoxFormFromItem(item);
  const baseline = collectionBoxBaselineFromItem(item);

  assert.equal(form.status, 'doing');
  assert.equal(form.watchedCount, '3');
  assert.equal(form.tagDraft, '');
  assert.equal(isCollectionBoxFormDirty(form, baseline), false);

  form.comment = '改了';
  assert.equal(isCollectionBoxFormDirty(form, baseline), true);
  form.comment = '不错';
  form.tagDraft = '新标签';
  assert.equal(isCollectionBoxFormDirty(form, baseline), true);
});

test('save commits a typed-but-unsubmitted tag and clamps watch progress', () => {
  const item = watchingItem({
    collectionStatus: 'doing',
    comment: '  留白  ',
    tags: ['日常'],
  });
  const form = collectionBoxFormFromItem(item);
  form.watchedCount = '99';
  form.tagDraft = '治愈';

  const draft = collectionBoxDraftFromForm(form, item, true);

  assert.equal(draft.watchedCount, 12);
  assert.deepEqual(draft.tags, ['日常', '治愈']);
  assert.equal(draft.comment, '留白');
});

test('wish status does not keep a rating, and missing fields stay omitted', () => {
  const item = watchingItem({
    collectionStatus: 'wish',
    rating: 7,
    watchedEpisodeNumbers: [1],
  });
  const form = collectionBoxFormFromItem(item);
  const draft = collectionBoxDraftFromForm(form, item, false);

  assert.equal(draft.rating, undefined);
  assert.equal(draft.comment, undefined);
  assert.equal(draft.tags, undefined);
  assert.equal(draft.isPrivate, undefined);
  assert.equal(draft.watchedCount, 0);
});
