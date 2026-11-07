import assert from 'node:assert/strict';
import test from 'node:test';

import { loadStatus } from '../src/lib/query-status.ts';

const query = (overrides) => ({ isError: false, isPaused: false, isPending: false, ...overrides });

test('a first read paused by the network reads as a failure, not endless loading', () => {
  assert.deepEqual(loadStatus(query({ isPaused: true, isPending: true })), { isError: true, isPending: false });
});

test('a normal first read stays loading', () => {
  assert.deepEqual(loadStatus(query({ isPending: true })), { isError: false, isPending: true });
});

test('a paused refresh with saved data does not become a failure', () => {
  assert.deepEqual(loadStatus(query({ isPaused: true })), { isError: false, isPending: false });
});

test('a real failure stays a failure', () => {
  assert.deepEqual(loadStatus(query({ isError: true })), { isError: true, isPending: false });
});
