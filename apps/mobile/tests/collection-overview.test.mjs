import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCollectionOverview,
  buildCollectionOverviewJson,
  buildCollectionOverviewShareText,
  buildCollectionStatusAnalysis,
} from '../src/features/collections/collection-overview-model.ts';

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

test('collection status analysis exposes useful progress and backlog metrics', () => {
  const analysis = buildCollectionStatusAnalysis(2, [
    { status: 'completed', total: 60 },
    { status: 'doing', total: 10 },
    { status: 'wish', total: 20 },
    { status: 'onHold', total: 5 },
    { status: 'dropped', total: 5 },
  ]);

  assert.equal(analysis.total, 100);
  assert.equal(analysis.completed, 60);
  assert.equal(analysis.active, 10);
  assert.equal(analysis.backlog, 25);
  assert.equal(analysis.completionRate, 75);
  assert.deepEqual(
    analysis.items.map(({ label, percentage }) => ({ label, percentage })),
    [
      { label: '看过', percentage: 60 },
      { label: '在看', percentage: 10 },
      { label: '想看', percentage: 20 },
      { label: '搁置', percentage: 5 },
      { label: '抛弃', percentage: 5 },
    ],
  );
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

test('collection overview exports honest text and provider-neutral JSON', () => {
  const overview = buildCollectionOverview([
    { subjectType: 2, total: 3 },
    { subjectType: 1, total: 1 },
  ]);

  assert.equal(
    buildCollectionOverviewShareText(overview, 'kaku'),
    [
      'Kaku 收藏分析',
      '@kaku · 共 4 部',
      '',
      '动画 3 部（75%）',
      '书籍 1 部（25%）',
      '',
      '数据来自 Bangumi 当前公开收藏总数。',
    ].join('\n'),
  );
  assert.deepEqual(JSON.parse(buildCollectionOverviewJson(overview, 'kaku')), {
    source: 'bangumi-public-collection-totals',
    total: 4,
    types: [
      { label: '动画', subjectType: 2, total: 3 },
      { label: '书籍', subjectType: 1, total: 1 },
    ],
    username: 'kaku',
    version: 1,
  });
});
