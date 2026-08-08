import assert from 'node:assert/strict';
import test from 'node:test';

import { browseBangumiSubjects } from '../src/browse/bangumi-client.ts';

test('browse forwards type, sort, year, and tags to Bangumi P1', async () => {
  const fetcher = async (input) => {
    assert.equal(
      String(input),
      'https://next.bgm.tv/p1/subjects?type=2&sort=trends&page=1&year=2026&tags=TV&tags=%E6%BC%AB%E7%94%BB%E6%94%B9',
    );
    return Response.json({
      data: [{
        id: 622206,
        images: { common: 'https://lain.bgm.tv/cover.jpg' },
        name: 'ヤニねこ',
        nameCN: '尼古喵喵',
        rating: { score: 7.17 },
        type: 2,
      }],
      total: 2,
    });
  };

  const result = await browseBangumiSubjects({
    fetcher,
    page: 1,
    sort: 'trends',
    subjectType: 2,
    tags: ['TV', '漫画改'],
    year: 2026,
  });

  assert.equal(result.items[0]?.title, '尼古喵喵');
  assert.equal(result.nextPage, 2);
  assert.equal(result.totalPages, 2);
});
