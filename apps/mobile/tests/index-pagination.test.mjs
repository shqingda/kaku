import assert from 'node:assert/strict';
import test from 'node:test';

import {
  toPublicIndexItemPage,
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

test('index item page maps subjects and exposes its next offset', () => {
  const page = toPublicIndexItemPage(
    {
      data: [
        {
          comment: '推荐',
          subject: {
            id: 400602,
            images: { common: 'https://lain.bgm.tv/frieren.jpg' },
            name: 'Sousou no Frieren',
            nameCN: '葬送的芙莉莲',
            rating: { score: 8.5 },
            type: 2,
          },
        },
      ],
      total: 2,
    },
    0,
  );

  assert.equal(page.nextOffset, 1);
  assert.deepEqual(page.items[0], {
    comment: '推荐',
    coverUrl: 'https://lain.bgm.tv/frieren.jpg',
    id: 400602,
    score: 8.5,
    title: '葬送的芙莉莲',
    type: 2,
  });
});

test('index item page stops at the end', () => {
  const page = toPublicIndexItemPage(
    {
      data: [{ comment: '', subject: undefined }],
      total: 1,
    },
    0,
  );

  assert.equal(page.nextOffset, undefined);
  assert.deepEqual(page.items, []);
});
