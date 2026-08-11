import assert from 'node:assert/strict';
import test from 'node:test';

import {
  toPublicTimelinePage,
} from '../src/infrastructure/bangumi/users/adapter.ts';
import { bangumiUserTimelineSchema } from '../src/infrastructure/bangumi/api-next/schemas.ts';

function timelineItem(id) {
  return {
    batch: false,
    cat: 3,
    createdAt: id,
    id,
    memo: {
      subject: [
        {
          subject: {
            id: id + 1000,
            name: `Subject ${id}`,
            nameCN: `条目 ${id}`,
            type: 2,
          },
        },
      ],
    },
    type: 10,
  };
}

test('public timeline uses the last item as its next cursor', () => {
  const fullPage = toPublicTimelinePage(
    bangumiUserTimelineSchema.parse(
      Array.from({ length: 10 }, (_, index) => timelineItem(100 - index)),
    ),
    10,
  );
  const finalPage = toPublicTimelinePage(
    bangumiUserTimelineSchema.parse([timelineItem(90), timelineItem(89)]),
    10,
  );

  assert.equal(fullPage.nextCursor, '91');
  assert.equal(fullPage.items[0].subjectId, 1100);
  assert.equal(fullPage.items[0].text, '在看 《条目 100》');
  assert.equal(finalPage.nextCursor, undefined);
});

test('public timeline keeps episode progress semantics', () => {
  const timeline = bangumiUserTimelineSchema.parse([
    {
      batch: true,
      cat: 4,
      createdAt: 100,
      id: 200,
      memo: {
        progress: {
          batch: {
            epsTotal: '12',
            epsUpdate: 5,
            subject: {
              id: 300,
              name: 'Example',
              nameCN: '示例动画',
              type: 2,
            },
            volsTotal: '0',
          },
        },
      },
      type: 0,
    },
  ]);

  const page = toPublicTimelinePage(timeline, 10);

  assert.equal(page.items[0].subjectId, 300);
  assert.equal(page.items[0].text, '完成了 《示例动画》 5 of 12 话');
});

test('public timeline explains a registration event', () => {
  const timeline = bangumiUserTimelineSchema.parse([
    {
      batch: false,
      cat: 1,
      createdAt: 100,
      id: 201,
      memo: {},
      type: 1,
    },
  ]);

  const page = toPublicTimelinePage(timeline, 10);

  assert.equal(page.items[0].text, '加入了 Bangumi');
});

test('public timeline keeps friend and person collection semantics', () => {
  const timeline = bangumiUserTimelineSchema.parse([
    {
      batch: false,
      cat: 1,
      createdAt: 101,
      id: 202,
      memo: {
        daily: {
          users: [
            {
              avatar: {},
              id: 1,
              nickname: '蓝与火',
              username: 'blue-fire',
            },
          ],
        },
      },
      type: 2,
    },
    {
      batch: false,
      cat: 8,
      createdAt: 100,
      id: 201,
      memo: {
        mono: {
          characters: [],
          persons: [{ id: 2, name: 'ゆたかめ' }],
        },
      },
      type: 1,
    },
  ]);

  const page = toPublicTimelinePage(timeline, 10);

  assert.equal(page.items[0].text, '将 蓝与火 加为了好友');
  assert.equal(page.items[1].text, '收藏了人物 ゆたかめ');
});
