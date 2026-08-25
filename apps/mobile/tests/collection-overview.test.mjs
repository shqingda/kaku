import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCollectionOverview } from '../src/features/collections/collection-overview-model.ts';

test('collection overview totals media types and keeps their input order', () => {
  const overview = buildCollectionOverview([
    { subjectType: 2, total: 60 },
    { subjectType: 1, total: 30 },
    { subjectType: 4, total: 10 },
  ]);

  assert.equal(overview.total, 100);
  assert.deepEqual(overview.items, [
    { label: '动画', percentage: 60, subjectType: 2, total: 60 },
    { label: '书籍', percentage: 30, subjectType: 1, total: 30 },
    { label: '游戏', percentage: 10, subjectType: 4, total: 10 },
  ]);
});

test('collection overview returns zero percentages for an empty collection', () => {
  const overview = buildCollectionOverview([
    { subjectType: 2, total: 0 },
    { subjectType: 3, total: 0 },
  ]);

  assert.equal(overview.total, 0);
  assert.deepEqual(
    overview.items.map((item) => item.percentage),
    [0, 0],
  );
});
