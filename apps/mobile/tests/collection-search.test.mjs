import assert from 'node:assert/strict';
import test from 'node:test';
import { collectSearchPages, searchCollections, parseCollectionSearch, collectionSearchStorageKey, DEFAULT_COLLECTION_SEARCH } from '../src/features/collections/collection-search.ts';
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
