import assert from 'node:assert/strict';
import test from 'node:test';

import { buildBrowsingFootprint } from '../src/features/history/browsing-footprint-model.ts';

test('browsing footprint summarizes unique items, days and subject types', () => {
  const footprint = buildBrowsingFootprint([
    { id: 1, title: 'A', type: 2, viewedAt: Date.UTC(2026, 7, 24, 10) },
    { id: 2, title: 'B', type: 2, viewedAt: Date.UTC(2026, 7, 24, 12) },
    { id: 3, title: 'C', type: 1, viewedAt: Date.UTC(2026, 7, 25, 9) },
  ]);

  assert.equal(footprint.uniqueSubjects, 3);
  assert.equal(footprint.activeDays, 2);
  assert.equal(footprint.latestViewedAt, Date.UTC(2026, 7, 25, 9));
  assert.deepEqual(footprint.typeCounts, [
    { count: 2, label: '动画', type: 2 },
    { count: 1, label: '书籍', type: 1 },
  ]);
});
