import assert from 'node:assert/strict';
import test from 'node:test';

import { BLOG_FILTERS } from '../src/features/blogs/model.ts';

test('blog filters cover every bangumi subject type plus an all entry', () => {
  assert.deepEqual(
    BLOG_FILTERS.map((filter) => filter.id),
    ['all', 'anime', 'book', 'music', 'game', 'real'],
  );
  assert.deepEqual(
    BLOG_FILTERS.map((filter) => filter.label),
    ['全部', '动画', '书籍', '音乐', '游戏', '三次元'],
  );
});

test('blog filter ids are unique so query keys never collide', () => {
  const ids = BLOG_FILTERS.map((filter) => filter.id);
  assert.equal(new Set(ids).size, ids.length);
});
