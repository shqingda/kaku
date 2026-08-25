import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addRecentSubject,
  mergeRecentSubjects,
  parseRecentSubjectsRecord,
  RECENT_SUBJECT_LIMIT,
} from '../src/features/history/recent-subjects-model.ts';

const first = {
  id: 1,
  title: '无职转生',
  type: 2,
  viewedAt: 100,
};
const second = {
  id: 2,
  title: '葬送的芙莉莲',
  type: 2,
  viewedAt: 200,
};

test('recent subjects keep the latest visit and remove duplicates', () => {
  assert.deepEqual(
    addRecentSubject([first, second], { ...first, viewedAt: 300 }),
    [{ ...first, viewedAt: 300 }, second],
  );
});

test('recent subjects keep only the latest ten entries', () => {
  const current = Array.from({ length: RECENT_SUBJECT_LIMIT }, (_, index) => ({
    ...first,
    id: index + 1,
    viewedAt: index + 1,
  }));
  const next = addRecentSubject(current, { ...first, id: 99, viewedAt: 99 });

  assert.equal(next.length, RECENT_SUBJECT_LIMIT);
  assert.equal(next[0]?.id, 99);
  assert.equal(next.at(-1)?.id, 9);
});

test('legacy recent subjects use their latest real visit as sync time', () => {
  assert.deepEqual(parseRecentSubjectsRecord([first, second]), {
    items: [second, first],
    updatedAt: 200,
  });
});

test('recent subject sync merges device visits by item timestamp', () => {
  const local = { items: [first], updatedAt: 100 };
  const cloud = { items: [second], updatedAt: 200 };
  assert.deepEqual(mergeRecentSubjects(local, cloud), {
    record: { items: [second, first], updatedAt: 200 },
    pushToCloud: true,
  });
});

test('a newer empty record clears recent subjects across devices', () => {
  const populated = { items: [first], updatedAt: 100 };
  const cleared = { items: [], updatedAt: 200 };
  assert.deepEqual(mergeRecentSubjects(populated, cleared), {
    record: cleared,
    pushToCloud: false,
  });
  assert.deepEqual(mergeRecentSubjects(cleared, populated), {
    record: cleared,
    pushToCloud: true,
  });
});
