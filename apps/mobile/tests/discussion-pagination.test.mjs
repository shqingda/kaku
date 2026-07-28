import assert from 'node:assert/strict';
import test from 'node:test';

import { getNextTopicOffset } from '../src/features/discussions/topic-pagination.ts';

test('subject topic page exposes the next offset', () => {
  assert.equal(getNextTopicOffset(30, 1, 32), 31);
});

test('subject topic page stops after its last item', () => {
  assert.equal(getNextTopicOffset(30, 1, 31), undefined);
});

test('subject topic page stops when the API returns no items', () => {
  assert.equal(getNextTopicOffset(30, 0, 32), undefined);
});
