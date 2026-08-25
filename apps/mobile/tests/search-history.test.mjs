import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addRecentSearch,
  mergeSearchHistory,
  parseSearchHistoryRecord,
} from '../src/features/search/search-history-model.ts';

test('recent search keeps the newest unique keyword first', () => {
  assert.deepEqual(
    addRecentSearch(['芙莉莲', '攻壳机动队', '无职转生'], '攻壳机动队'),
    ['攻壳机动队', '芙莉莲', '无职转生'],
  );
});

test('legacy local arrays migrate without inventing a sync timestamp', () => {
  assert.deepEqual(parseSearchHistoryRecord([' Kaku ', 'Kaku', 42]), {
    items: ['Kaku'],
    updatedAt: null,
  });
});

test('search history merge keeps the newest side and requests a push for local changes', () => {
  const local = { items: ['本机'], updatedAt: 200 };
  const cloud = { items: ['云端'], updatedAt: 100 };
  assert.deepEqual(mergeSearchHistory(local, cloud), {
    record: local,
    pushToCloud: true,
  });
  assert.deepEqual(mergeSearchHistory(cloud, local), {
    record: local,
    pushToCloud: false,
  });
});

test('recent search ignores blank input and keeps at most eight items', () => {
  const original = ['1', '2'];
  assert.equal(addRecentSearch(original, '   '), original);
  assert.deepEqual(
    addRecentSearch(['1', '2', '3', '4', '5', '6', '7', '8'], 'new'),
    ['new', '1', '2', '3', '4', '5', '6', '7'],
  );
});
