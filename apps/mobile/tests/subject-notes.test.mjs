import assert from 'node:assert/strict';
import test from 'node:test';

import {
  removeSubjectNote,
  upsertSubjectNote,
} from '../src/features/notes/model.ts';

function note(subjectId, content, updatedAt = subjectId) {
  return {
    content,
    subjectId,
    title: `条目 ${subjectId}`,
    updatedAt,
  };
}

test('upsertSubjectNote adds a new note at the front', () => {
  const current = [
    note(1, '旧笔记'),
    note(2, '另一个条目'),
  ];
  const next = upsertSubjectNote(current, note(3, '新笔记'));

  assert.equal(next.length, 3);
  assert.equal(next[0].subjectId, 3);
  assert.equal(next[0].content, '新笔记');
});

test('upsertSubjectNote updates an existing note in place', () => {
  const current = [
    note(1, '旧内容', 100),
    note(2, '另一个条目', 200),
  ];
  const next = upsertSubjectNote(current, note(1, '新内容', 300));

  assert.equal(next.length, 2);
  assert.equal(next[0].subjectId, 1);
  assert.equal(next[0].content, '新内容');
  assert.equal(next[0].updatedAt, 300);
  assert.equal(next[1].subjectId, 2);
});

test('upsertSubjectNote removes the note when content is blank', () => {
  const current = [
    note(1, '要删除的笔记'),
    note(2, '保留'),
  ];
  const next = upsertSubjectNote(current, note(1, '   '));

  assert.deepEqual(next.map((item) => item.subjectId), [2]);
});

test('removeSubjectNote removes only the requested subject', () => {
  const current = [
    note(1, '一'),
    note(2, '二'),
    note(3, '三'),
  ];

  assert.deepEqual(
    removeSubjectNote(current, 2).map((item) => item.subjectId),
    [1, 3],
  );
});
