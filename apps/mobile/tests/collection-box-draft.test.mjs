import assert from 'node:assert/strict';
import test from 'node:test';

import {
  collectionBoxBaselineFromItem,
  collectionBoxDraftFromForm,
  collectionBoxFormFromItem,
  collectionBoxUpdateFromDraft,
  collectionInactiveNotice,
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

test('inactive notice explains what the wish status skips recording', () => {
  assert.equal(
    collectionInactiveNotice('wish', 2, true, false),
    '想看状态不记录观看进度和评分',
  );
  assert.equal(
    collectionInactiveNotice('wish', 1, false, true),
    '想读状态不记录阅读进度和评分',
  );
  assert.equal(
    collectionInactiveNotice('wish', 2, false, false),
    '想看状态不记录评分',
  );
  assert.equal(
    collectionInactiveNotice('wish', 2, true, true),
    '想看状态不记录观看进度、阅读进度和评分',
  );
});

test('inactive notice prompts status selection before rating', () => {
  assert.equal(
    collectionInactiveNotice(undefined, 2, true, false),
    '选择收藏状态后可记录观看进度和评分',
  );
  assert.equal(
    collectionInactiveNotice(undefined, 4, false, false),
    '选择收藏状态后可记录评分',
  );
});

test('update omits fields identical to the current collection', () => {
  const item = watchingItem({
    collectionStatus: 'doing',
    rating: 8,
  });
  const update = collectionBoxUpdateFromDraft(
    {
      collectionStatus: 'doing',
      comment: '新鲜吐槽',
      isPrivate: true,
      rating: 8,
      readChapterCount: undefined,
      readVolumeCount: undefined,
      tags: ['日常'],
      watchedCount: 3,
    },
    item,
    { supportsWatchProgress: true, supportsReadingProgress: false },
  );

  assert.equal(update.collectionStatus, undefined);
  assert.equal(update.rating, undefined);
  assert.equal(update.watchedEpisodeNumbers, undefined);
  assert.equal(update.comment, '新鲜吐槽');
  assert.equal(update.isPrivate, true);
  assert.deepEqual(update.tags, ['日常']);
});

test('update sends fields that actually changed', () => {
  const item = watchingItem({ collectionStatus: 'doing', rating: 8 });
  const update = collectionBoxUpdateFromDraft(
    {
      collectionStatus: 'completed',
      comment: undefined,
      isPrivate: undefined,
      rating: 9,
      readChapterCount: undefined,
      readVolumeCount: undefined,
      tags: undefined,
      watchedCount: 5,
    },
    item,
    { supportsWatchProgress: true, supportsReadingProgress: false },
  );

  assert.equal(update.collectionStatus, 'completed');
  assert.equal(update.rating, 9);
  assert.deepEqual(update.watchedEpisodeNumbers, [1, 2, 3, 4, 5]);
});

test('switching to wish zeroes progress but omits the rating', () => {
  const item = watchingItem({
    collectionStatus: 'doing',
    rating: 8,
    readChapterCount: 2,
    readVolumeCount: 1,
  });
  const update = collectionBoxUpdateFromDraft(
    {
      collectionStatus: 'wish',
      comment: undefined,
      isPrivate: undefined,
      rating: undefined,
      readChapterCount: 2,
      readVolumeCount: 1,
      tags: undefined,
      watchedCount: 0,
    },
    item,
    { supportsWatchProgress: true, supportsReadingProgress: true },
  );

  assert.equal(update.collectionStatus, 'wish');
  assert.equal(update.rating, undefined);
  assert.deepEqual(update.watchedEpisodeNumbers, []);
  assert.equal(update.readChapterCount, 0);
  assert.equal(update.readVolumeCount, 0);
});

test('already-cleared progress and reordered episodes stay quiet', () => {
  const item = watchingItem({
    collectionStatus: 'doing',
    watchedEpisodeNumbers: [3, 1, 2],
  });
  const update = collectionBoxUpdateFromDraft(
    {
      collectionStatus: 'doing',
      comment: undefined,
      isPrivate: undefined,
      rating: undefined,
      readChapterCount: undefined,
      readVolumeCount: undefined,
      tags: undefined,
      watchedCount: 3,
    },
    item,
    { supportsWatchProgress: true, supportsReadingProgress: true },
  );

  assert.equal(update.watchedEpisodeNumbers, undefined);
  assert.equal(update.readChapterCount, undefined);
  assert.equal(update.readVolumeCount, undefined);
});

test('unsupported progress types stay omitted even when inactive', () => {
  const item = watchingItem({});
  const update = collectionBoxUpdateFromDraft(
    {
      collectionStatus: 'wish',
      comment: undefined,
      isPrivate: undefined,
      rating: undefined,
      readChapterCount: 3,
      readVolumeCount: 2,
      tags: undefined,
      watchedCount: 0,
    },
    item,
    { supportsWatchProgress: false, supportsReadingProgress: false },
  );

  assert.equal(update.collectionStatus, 'wish');
  assert.equal(update.rating, undefined);
  assert.equal(update.watchedEpisodeNumbers, undefined);
  assert.equal(update.readChapterCount, undefined);
  assert.equal(update.readVolumeCount, undefined);
});
