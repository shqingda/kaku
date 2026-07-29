import assert from 'node:assert/strict';
import test from 'node:test';

import {
  toPublicTimelinePage,
} from '../src/infrastructure/bangumi/users/adapter.ts';

function timelineItem(id) {
  return {
    createdAt: id,
    id,
    memo: {
      subject: [
        {
          subject: {
            id: id + 1000,
            name: `Subject ${id}`,
            nameCN: `条目 ${id}`,
          },
        },
      ],
    },
  };
}

test('public timeline uses the last item as its next cursor', () => {
  const fullPage = toPublicTimelinePage(
    Array.from({ length: 10 }, (_, index) => timelineItem(100 - index)),
    10,
  );
  const finalPage = toPublicTimelinePage(
    [timelineItem(90), timelineItem(89)],
    10,
  );

  assert.equal(fullPage.nextCursor, '91');
  assert.equal(fullPage.items[0].subjectId, 1100);
  assert.equal(fullPage.items[0].text, '更新了《条目 100》的收藏状态');
  assert.equal(finalPage.nextCursor, undefined);
});
