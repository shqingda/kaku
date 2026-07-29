import assert from 'node:assert/strict';
import test from 'node:test';

import { toDiscoverSubjectPage } from '../src/infrastructure/bangumi/discover/adapter.ts';

const subject = {
  date: '2026-01-01',
  id: 1,
  images: { medium: 'http://lain.bgm.tv/pic/cover/m/example.jpg' },
  name: 'Original title',
  name_cn: '中文标题',
  rating: { score: 8.2, total: 100 },
};

test('Bangumi search page exposes the next offset', () => {
  const page = toDiscoverSubjectPage({
    data: [subject],
    limit: 1,
    offset: 30,
    total: 50,
  });

  assert.equal(page.nextOffset, 31);
  assert.equal(page.total, 50);
  assert.equal(page.items[0].type, 2);
  assert.equal(page.items[0].title, '中文标题');
  assert.equal(
    page.items[0].coverUrl,
    'https://lain.bgm.tv/pic/cover/m/example.jpg',
  );
});

test('Bangumi search keeps the selected subject type', () => {
  const page = toDiscoverSubjectPage(
    {
      data: [subject],
      limit: 30,
      offset: 0,
      total: 1,
    },
    4,
  );

  assert.equal(page.items[0].type, 4);
});

test('Bangumi search page stops at the final result', () => {
  const page = toDiscoverSubjectPage({
    data: [subject],
    limit: 30,
    offset: 49,
    total: 50,
  });

  assert.equal(page.nextOffset, undefined);
});
