import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isPrivateQuery,
  shouldPersistPublicQuery,
} from '../src/lib/query-persistence.ts';

test('only explicitly marked successful public queries are persisted', () => {
  assert.equal(
    shouldPersistPublicQuery({
      meta: { persist: true },
      state: { dataUpdatedAt: 1, status: 'success' },
    }),
    true,
  );
  assert.equal(
    shouldPersistPublicQuery({
      state: { dataUpdatedAt: 1, status: 'success' },
    }),
    false,
  );
});

test('pending, failed, and empty query results are not persisted', () => {
  for (const state of [
    { dataUpdatedAt: 0, status: 'success' },
    { dataUpdatedAt: 1, status: 'pending' },
    { dataUpdatedAt: 1, status: 'error' },
  ]) {
    assert.equal(
      shouldPersistPublicQuery({ meta: { persist: true }, state }),
      false,
    );
  }
});

test('only explicitly private queries are cleared after sign out', () => {
  assert.equal(isPrivateQuery({ meta: { private: true } }), true);
  assert.equal(isPrivateQuery({ meta: { persist: true } }), false);
  assert.equal(isPrivateQuery({}), false);
});
