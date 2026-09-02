import assert from 'node:assert/strict';
import test from 'node:test';

import { queryKeys } from '../src/lib/query-keys.ts';

test('prefetch targets keep stable public query keys', () => {
  assert.deepEqual(queryKeys.catalogSubject(12, 4), [
    'catalog-subject',
    'bangumi',
    4,
    12,
  ]);
  assert.deepEqual(queryKeys.calendar(), ['calendar', 'bangumi']);
  assert.deepEqual(queryKeys.rankedSubjects(2), [
    'ranked-subjects',
    'bangumi',
    2,
  ]);
  assert.deepEqual(queryKeys.channel(2), ['channel', 'kaku', 2]);
  assert.deepEqual(queryKeys.community(), ['community', 'bangumi']);
  assert.deepEqual(queryKeys.communityTopics(), [
    'community',
    'bangumi',
    'topics',
  ]);
  assert.deepEqual(queryKeys.subjectCharacters(12), [
    'subject-characters',
    'bangumi',
    'localized-v2',
    12,
  ]);
  assert.deepEqual(queryKeys.character(8), [
    'people',
    'bangumi',
    'character',
    8,
  ]);
});
