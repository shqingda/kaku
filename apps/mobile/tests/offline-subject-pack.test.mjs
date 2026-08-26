import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OFFLINE_SUBJECT_PACK_MAX,
  OFFLINE_SUBJECT_PACK_TTL_MS,
  parseOfflineSubjectPack,
  readPackedSubject,
  upsertOfflineSubject,
} from '../src/features/catalog/offline-subject-pack-model.ts';

function subject(id, title = `条目 ${id}`) {
  return {
    details: {},
    episodes: [{ airDate: '2026-01-01', description: '', discussionCount: 0, id, number: 1, originalTitle: title, title }],
    id,
    info: [],
    originalTitle: title,
    summary: '',
    tags: [],
    title,
    totalEpisodes: 1,
    type: 2,
  };
}

test('offline pack keeps the latest ten subjects and their episodes', () => {
  let pack = { items: [] };
  for (let id = 1; id <= 12; id += 1) {
    pack = upsertOfflineSubject(pack, subject(id), id * 1000);
  }

  assert.equal(pack.items.length, OFFLINE_SUBJECT_PACK_MAX);
  assert.deepEqual(
    pack.items.map((item) => item.subject.id),
    [12, 11, 10, 9, 8, 7, 6, 5, 4, 3],
  );
  assert.equal(pack.items[0].subject.episodes.length, 1);
});

test('offline pack ignores expired snapshots and strips the live source flag', () => {
  const now = 1_000_000;
  const pack = upsertOfflineSubject(
    { items: [] },
    { ...subject(8), offlineSource: 'pack' },
    now,
  );

  assert.equal(pack.items[0].subject.offlineSource, undefined);
  assert.equal(readPackedSubject(pack, 8, now)?.offlineSource, 'pack');
  assert.equal(
    readPackedSubject(pack, 8, now + OFFLINE_SUBJECT_PACK_TTL_MS + 1),
    null,
  );
});

test('parseOfflineSubjectPack drops malformed rows', () => {
  assert.deepEqual(parseOfflineSubjectPack(null).items, []);
  assert.deepEqual(
    parseOfflineSubjectPack({
      items: [
        { savedAt: 1, subject: subject(1) },
        { savedAt: 'nope' },
      ],
    }).items.map((item) => item.subject.id),
    [1],
  );
});
