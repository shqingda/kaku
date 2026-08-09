import assert from 'node:assert/strict';
import test from 'node:test';

import { addRecentSearch } from '../src/features/search/search-history-model.ts';

test('recent search keeps the newest unique keyword first', () => {
  assert.deepEqual(
    addRecentSearch(['芙莉莲', '攻壳机动队', '无职转生'], '攻壳机动队'),
    ['攻壳机动队', '芙莉莲', '无职转生'],
  );
});

test('recent search ignores blank input and keeps at most eight items', () => {
  const original = ['1', '2'];
  assert.equal(addRecentSearch(original, '   '), original);
  assert.deepEqual(
    addRecentSearch(['1', '2', '3', '4', '5', '6', '7', '8'], 'new'),
    ['new', '1', '2', '3', '4', '5', '6', '7'],
  );
});
