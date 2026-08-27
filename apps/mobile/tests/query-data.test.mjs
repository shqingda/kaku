import assert from 'node:assert/strict';
import test from 'node:test';

import {
  readInfiniteItems,
  readInfinitePages,
  readQueryArray,
  readQueryItems,
} from '../src/lib/query-data.ts';

test('readInfinitePages returns persisted pages when their container is valid', () => {
  const pages = [{ items: [{ id: 1 }] }];

  assert.deepEqual(readInfinitePages({ pages }), pages);
});

test('query data readers reject malformed persisted values', () => {
  assert.deepEqual(readInfinitePages({ pages: null }), []);
  assert.deepEqual(readInfinitePages([]), []);
  assert.deepEqual(readQueryItems({ items: 'invalid' }), []);
  assert.deepEqual(readQueryArray({ 0: 'not-an-array' }), []);
});

test('query data readers preserve valid list data', () => {
  assert.deepEqual(readQueryItems({ items: [1, 2] }), [1, 2]);
  assert.deepEqual(readQueryArray(['monday']), ['monday']);
});

test('readInfiniteItems flattens page items and skips malformed pages', () => {
  assert.deepEqual(
    readInfiniteItems({
      pages: [{ items: [{ id: 1 }] }, { items: 'nope' }, { items: [{ id: 2 }] }],
    }),
    [{ id: 1 }, { id: 2 }],
  );
  assert.deepEqual(readInfiniteItems({ pages: null }), []);
});
