import assert from 'node:assert/strict';
import test from 'node:test';

import {
  toCharacterSearchPage,
  toPersonSearchPage,
} from '../src/infrastructure/bangumi/people-browser/search-adapter.ts';

test('character search prefers a localized name and keeps pagination', () => {
  const page = toCharacterSearchPage({
    data: [
      {
        id: 1,
        images: { medium: 'https://example.com/character.jpg' },
        infobox: [{ key: '简体中文名', value: '芙莉莲' }],
        name: 'フリーレン',
        stat: { collects: 100, comments: 20 },
        summary: '千年以上生きるエルフ。',
        type: 1,
      },
    ],
    limit: 30,
    offset: 0,
    total: 31,
  });

  assert.equal(page.items[0].name, '芙莉莲');
  assert.equal(page.items[0].commentCount, 20);
  assert.equal(page.nextOffset, 1);
});

test('person search maps its shorter response without inventing comments', () => {
  const page = toPersonSearchPage({
    data: [
      {
        career: ['seiyu'],
        id: 2,
        images: null,
        name: '種﨑敦美',
        short_summary: null,
        type: 1,
      },
    ],
    limit: 30,
    offset: 0,
    total: 1,
  });

  assert.deepEqual(page.items[0].categories, ['声优']);
  assert.equal(page.items[0].commentCount, 0);
  assert.equal(page.items[0].metadata, '');
  assert.equal(page.nextOffset, undefined);
});
