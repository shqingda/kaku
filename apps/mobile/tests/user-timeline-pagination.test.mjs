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
