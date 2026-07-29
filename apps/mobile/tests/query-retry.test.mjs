import assert from 'node:assert/strict';
import test from 'node:test';

import {
  bangumiRetryDelay,
  shouldRetryBangumiQuery,
} from '../src/lib/query-retry.ts';

test('temporary Bangumi failures retry twice', () => {
  assert.equal(shouldRetryBangumiQuery(0, new Error('offline')), true);
  assert.equal(shouldRetryBangumiQuery(1, { status: 503 }), true);
  assert.equal(shouldRetryBangumiQuery(2, { status: 503 }), false);
});

test('permanent client errors do not retry', () => {
  assert.equal(shouldRetryBangumiQuery(0, { status: 401 }), false);
  assert.equal(shouldRetryBangumiQuery(0, { status: 404 }), false);
  assert.equal(shouldRetryBangumiQuery(0, { status: 422 }), false);
});

test('timeouts and rate limits may recover', () => {
  assert.equal(shouldRetryBangumiQuery(0, { status: 408 }), true);
  assert.equal(shouldRetryBangumiQuery(0, { status: 429 }), true);
});

test('retry delay backs off without becoming sluggish', () => {
  assert.deepEqual(
    [0, 1, 2, 3, 4].map(bangumiRetryDelay),
    [600, 1_200, 2_400, 3_000, 3_000],
  );
});
