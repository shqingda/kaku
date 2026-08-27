import assert from 'node:assert/strict';
import test from 'node:test';

import {
  discussionReplyOps,
  discussionReplyQueryKey,
} from '../src/features/discussions/discussion-reply-target.ts';
import { queryKeys } from '../src/lib/query-keys.ts';

const KINDS = [
  'character',
  'episode',
  'group-topic',
  'person',
  'review',
  'subject-topic',
];

test('each discussion target kind has create, edit, delete, and a query key', () => {
  for (const kind of KINDS) {
    const ops = discussionReplyOps({ id: 12, kind });
    assert.equal(typeof ops.create, 'function');
    assert.equal(typeof ops.edit, 'function');
    assert.equal(typeof ops.remove, 'function');
    assert.deepEqual(ops.queryKey(12), discussionReplyQueryKey({ id: 12, kind }));
  }
});

test('query keys stay on the existing cache entries', () => {
  assert.deepEqual(
    discussionReplyQueryKey({ id: 1, kind: 'subject-topic' }),
    queryKeys.subjectTopic(1),
  );
  assert.deepEqual(
    discussionReplyQueryKey({ id: 2, kind: 'group-topic' }),
    queryKeys.groupTopic(2),
  );
  assert.deepEqual(
    discussionReplyQueryKey({ id: 3, kind: 'episode' }),
    queryKeys.episodeComments(3),
  );
  assert.deepEqual(
    discussionReplyQueryKey({ id: 4, kind: 'review' }),
    queryKeys.subjectReview(4),
  );
  assert.deepEqual(
    discussionReplyQueryKey({ id: 5, kind: 'character' }),
    queryKeys.entityComments('character', 5),
  );
  assert.deepEqual(
    discussionReplyQueryKey({ id: 6, kind: 'person' }),
    queryKeys.entityComments('person', 6),
  );
});
