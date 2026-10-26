import assert from 'node:assert/strict';
import test from 'node:test';

import { EMPTY_SUMMARY, toProgressSubject } from '../src/features/subject-detail/progress-subject.ts';

const subject = {
  coverUrl: 'https://lain.bgm.tv/pic/cover/l/1.jpg',
  details: {},
  episodes: [{ airDate: '2024-01-01', id: 11, number: 1, title: '' }, { id: 12, number: 2, title: '' }],
  id: 1,
  summary: '',
  title: '条目',
  totalEpisodes: 2,
  type: 2,
};

test('signed-out progress leaves personal fields undefined', () => {
  const item = toProgressSubject(subject, undefined, { signedIn: false, collectionLoaded: false, subjectId: 1 });

  assert.equal(item.collectionStatus, null);
  assert.equal(item.comment, undefined);
  assert.equal(item.isPrivate, undefined);
  assert.equal(item.tags, undefined);
  assert.equal(item.readChapterCount, undefined);
  assert.equal(item.watchedEpisodeIds, undefined);
  assert.deepEqual(item.watchedEpisodeNumbers, []);
  assert.deepEqual(item.episodeAirDates, ['2024-01-01', '']);
  assert.equal(item.summary, EMPTY_SUMMARY);
  assert.equal(item.year, 0);
  assert.equal(toProgressSubject(subject, undefined, { signedIn: false, collectionLoaded: false, subjectId: 9 }).id, 9);
});

test('signed-in progress fills defaults and only confirms empty episodes once loaded', () => {
  const pending = toProgressSubject(subject, undefined, { signedIn: true, collectionLoaded: false, subjectId: 1 });
  assert.equal(pending.comment, '');
  assert.equal(pending.isPrivate, false);
  assert.deepEqual(pending.tags, []);
  assert.equal(pending.watchedEpisodeIds, undefined);

  const none = toProgressSubject(subject, null, { signedIn: true, collectionLoaded: true, subjectId: 1 });
  assert.deepEqual(none.watchedEpisodeIds, []);
});

test('book progress carries chapter and volume counts for signed-in users', () => {
  const book = { ...subject, type: 1, year: 2020, summary: '简介' };
  const collection = {
    collectionStatus: 'doing', comment: '好看', isPrivate: true, rating: 8,
    readChapterCount: 3, readVolumeCount: 1, tags: ['a'],
    watchedEpisodeIds: [11], watchedEpisodeNumbers: [1],
  };
  const item = toProgressSubject(book, collection, { signedIn: true, collectionLoaded: true, subjectId: 1 });

  assert.equal(item.readChapterCount, 3);
  assert.equal(item.readVolumeCount, 1);
  assert.equal(item.rating, 8);
  assert.deepEqual(item.watchedEpisodeIds, [11]);
  assert.equal(item.summary, '简介');
  assert.equal(item.year, 2020);
});
