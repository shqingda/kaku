import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectSearchPages,
  collectionSearchStorageKey,
  DEFAULT_COLLECTION_SEARCH,
  describeMyCollectionLoad,
  listItemFromPersonalCollection,
  parseCollectionSearch,
  searchCollections,
} from '../src/features/collections/collection-search.ts';
const first = { id: 1, title: '第一项', subjectType: 2, collectionStatus: 'doing', updatedAt: '2026-09-01T00:00:00Z' };
const second = { id: 2, title: '第二项', originalTitle: 'ＦＲＩＥＲＥＮ', subjectType: 1, collectionStatus: 'completed', updatedAt: '2026-09-05T00:00:00Z' };
test('search finds later pages and normalized original titles', () => {
  const partial = collectSearchPages([{ items: [first], total: 2, nextOffset: 1 }]);
  assert.equal(partial.complete, false);
  const full = collectSearchPages([{ items: [first], total: 2, nextOffset: 1 }, { items: [second], total: 2 }]);
  assert.equal(full.complete, true);
  assert.deepEqual(searchCollections(full.items, { ...DEFAULT_COLLECTION_SEARCH, keyword: ' frieren ' }).map(item => item.id), [2]);
});
test('duplicate or missing pages cannot report a complete collection', () => {
  assert.equal(collectSearchPages([{ items: [first], total: 2 }, { items: [first], total: 2 }]).complete, false);
  assert.equal(collectSearchPages([]).complete, false);
  assert.equal(collectSearchPages([{ items: [], total: 0 }]).complete, true);
});
test('type and status combine; recent order uses timestamps without changing input', () => {
  const items = [first, second];
  assert.deepEqual(searchCollections(items, DEFAULT_COLLECTION_SEARCH).map(item => item.id), [2, 1]);
  assert.deepEqual(searchCollections(items, { ...DEFAULT_COLLECTION_SEARCH, subjectType: 2, status: 'completed' }), []);
  assert.deepEqual(items.map(item => item.id), [1, 2]);
});
test('preferences restore safely and keys isolate accounts', () => {
  const value = { keyword: 'test', subjectType: 6, status: 'doing' };
  assert.deepEqual(parseCollectionSearch(JSON.stringify({ ...value, sort: 'title' })), value);
  assert.deepEqual(parseCollectionSearch(null), DEFAULT_COLLECTION_SEARCH);
  assert.equal(parseCollectionSearch('{"subjectType":99,"sort":"wrong"}').subjectType, 0);
  assert.notEqual(collectionSearchStorageKey(1), collectionSearchStorageKey(2));
});
test('personal collection updates patch the matching list row', () => {
  const item = {
    id: 8,
    title: '书',
    subjectType: 1,
    collectionStatus: 'doing',
    progress: 2,
    volumeProgress: 1,
    totalEpisodes: 10,
    updatedAt: '2026-01-01T00:00:00Z',
  };
  const next = listItemFromPersonalCollection(
    item,
    {
      collectionStatus: 'completed',
      comment: '',
      isPrivate: false,
      readChapterCount: 10,
      readVolumeCount: 3,
      rating: 9,
      subjectId: 8,
      tags: [],
      watchedEpisodeNumbers: [],
    },
    '2026-09-05T12:00:00Z',
  );
  assert.equal(next.collectionStatus, 'completed');
  assert.equal(next.progress, 10);
  assert.equal(next.volumeProgress, 3);
  assert.equal(next.rate, 9);
  assert.equal(next.updatedAt, '2026-09-05T12:00:00Z');
});
const load = {
  complete: true,
  hasNextPage: false,
  isError: false,
  isFetching: false,
  isPending: false,
  loaded: 0,
  matched: 0,
  paused: false,
  searching: false,
  total: 0,
};
test('collection load copy stays in one place', () => {
  assert.equal(describeMyCollectionLoad({ ...load, paused: true }).empty?.kind, 'offline');
  assert.equal(describeMyCollectionLoad({ ...load, isPending: true }).empty?.kind, 'loading');
  assert.equal(describeMyCollectionLoad({ ...load, isError: true }).empty?.kind, 'error');
  assert.equal(
    describeMyCollectionLoad({ ...load, searching: true, loaded: 1, total: 4, matched: 0, complete: false, hasNextPage: true }).subtitle,
    '已读取 1/4 项，搜索结果尚不完整',
  );
  assert.equal(
    describeMyCollectionLoad({ ...load, searching: true, loaded: 2, total: 2, matched: 0, complete: false }).showStaleRefresh,
    true,
  );
  assert.equal(
    describeMyCollectionLoad({ ...load, searching: true, loaded: 2, total: 2, matched: 1 }).subtitle,
    '2 个条目 · 找到 1 项',
  );
  assert.equal(describeMyCollectionLoad({ ...load, loaded: 3, total: 3, matched: 3 }).empty, null);
});
