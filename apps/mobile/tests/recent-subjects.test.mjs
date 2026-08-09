import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addRecentSubject,
  RECENT_SUBJECT_LIMIT,
} from '../src/features/history/recent-subjects-model.ts';

function subject(id, viewedAt = id) {
  return { id, title: `条目 ${id}`, type: 2, viewedAt };
}

test('recent subjects keep the latest visit and remove duplicates', () => {
  const next = addRecentSubject(
    [subject(1, 1), subject(2, 2)],
    subject(2, 3),
  );

  assert.deepEqual(next, [subject(2, 3), subject(1, 1)]);
});

test('recent subjects keep only the latest ten entries', () => {
  const current = Array.from({ length: RECENT_SUBJECT_LIMIT }, (_, index) =>
    subject(index + 1),
  );
  const next = addRecentSubject(current, subject(99));

  assert.equal(next.length, RECENT_SUBJECT_LIMIT);
  assert.equal(next[0]?.id, 99);
  assert.equal(next.at(-1)?.id, 9);
});
