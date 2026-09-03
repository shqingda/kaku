import assert from 'node:assert/strict';
import test from 'node:test';

import { INDEX_SORTS } from '../src/features/indexes/model.ts';

test('indexes sort by newest and popular with Chinese labels', () => {
  assert.deepEqual(INDEX_SORTS, [
    { id: 'latest', label: '最新' },
    { id: 'popular', label: '热门' },
  ]);
});

test('index sort ids are unique so query keys never collide', () => {
  const ids = INDEX_SORTS.map((sort) => sort.id);
  assert.equal(new Set(ids).size, ids.length);
});
