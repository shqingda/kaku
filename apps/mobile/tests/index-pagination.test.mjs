import assert from 'node:assert/strict';
import test from 'node:test';

import {
  toPublicIndexPage,
} from '../src/infrastructure/bangumi/indexes/adapter.ts';

function indexSummary(id) {
  return {
    collects: 0,
    createdAt: id,
    desc: '',
    id,
    replies: 0,
    title: `目录 ${id}`,
    total: 3,
    updatedAt: id,
  };
}

test('subject index page advances by the requested window size', () => {
  const page = toPublicIndexPage(
    {
      data: [indexSummary(1), indexSummary(2)],
      total: 100,
    },
    0,
    30,
  );

  assert.equal(page.nextOffset, 30);
  assert.equal(page.total, 100);
  assert.equal(page.items[0].title, '目录 1');
});

test('subject index page stops on its final or empty response', () => {
  const finalPage = toPublicIndexPage(
    { data: [indexSummary(3)], total: 31 },
    30,
    30,
  );
  const emptyPage = toPublicIndexPage(
    { data: [], total: 100 },
    30,
    30,
  );

  assert.equal(finalPage.nextOffset, undefined);
  assert.equal(emptyPage.nextOffset, undefined);
});
