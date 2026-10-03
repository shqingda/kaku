import assert from 'node:assert/strict';
import test from 'node:test';

import {
  boundQuerySnapshot,
  deserializeQuerySnapshot,
  QUERY_SNAPSHOT_MAX_BYTES,
  serializeQuerySnapshot,
} from '../src/lib/query-snapshot.ts';
import { isPrivateQuery, QUERY_CACHE_MAX_AGE } from '../src/lib/query-persistence.ts';

const now = Date.now();
function query(id, data = { id }, dataUpdatedAt = now) {
  return {
    queryKey: ['test', id], queryHash: `test-${id}`, meta: { persist: true },
    state: { data, dataUpdatedAt, status: 'success', fetchStatus: 'idle' },
  };
}
function client(queries, mutations = []) {
  return { timestamp: now, buster: 'public-catalog-v2', clientState: { queries, mutations } };
}

test('keeps the 100 most recently updated queries without sorting the source', () => {
  const source = client(Array.from({ length: 110 }, (_, index) => query(index, index, now - 110 + index)));
  const snapshot = boundQuerySnapshot(source, now);
  assert.equal(snapshot.clientState.queries.length, 100);
  assert.deepEqual(snapshot.clientState.queries.map((item) => item.state.data),
    Array.from({ length: 100 }, (_, index) => 109 - index));
  assert.equal(source.clientState.queries[0].state.data, 0);
  assert.equal(source.clientState.queries.length, 110);
});

test('expires each query by its data timestamp even inside a newly written snapshot', () => {
  const source = client([
    query('expired', {}, now - QUERY_CACHE_MAX_AGE - 1),
    query('boundary', {}, now - QUERY_CACHE_MAX_AGE),
    query('fresh'),
  ]);
  assert.deepEqual(boundQuerySnapshot(source, now).clientState.queries.map((item) => item.queryKey[1]),
    ['fresh', 'boundary']);
});

test('trims pages with matching page parameters and preserves metadata without mutating source', () => {
  const source = client([{
    ...query('private', { pages: [{ next: 'b' }, { next: 'c' }, { next: 'd' }], pageParams: [null, 'b', 'c'], extra: 'kept' }),
    meta: { persist: true, private: true, scope: 'account' },
  }], [{ state: { variables: { text: 'unsent' } } }]);
  const original = structuredClone(source);
  const snapshot = boundQuerySnapshot(source, now);
  assert.deepEqual(snapshot.clientState.queries[0], {
    ...source.clientState.queries[0],
    state: { ...source.clientState.queries[0].state,
      data: { pages: [{ next: 'b' }, { next: 'c' }], pageParams: [null, 'b'], extra: 'kept' } },
  });
  assert.equal(snapshot.timestamp, source.timestamp);
  assert.equal(snapshot.buster, source.buster);
  assert.equal(isPrivateQuery(snapshot.clientState.queries[0]), true);
  assert.deepEqual(snapshot.clientState.mutations, []);
  assert.deepEqual(source, original);
});

test('keeps page parameters paired and leaves regular query data intact', () => {
  const data = [null, { pages: 'plain', pageParams: [] }, { pages: [], pageParams: 'plain' },
    { pages: [1, 2, 3], pageParams: ['first'] }];
  const snapshot = boundQuerySnapshot(client(data.map((value, id) => query(id, value))), now);
  assert.deepEqual(snapshot.clientState.queries.map((item) => item.state.data),
    [...data.slice(0, 3), { pages: [1], pageParams: ['first'] }]);
});

test('enforces a total UTF-8 budget including Chinese, emoji, keys, and JSON punctuation', () => {
  const source = client([
    query('newest', 'aé汉🙂'.repeat(100_000), now),
    query('next', 'aé汉🙂'.repeat(130_000), now - 1),
    query('small', 'still useful', now - 2),
  ]);
  const result = boundQuerySnapshot(source, now);
  assert.ok(Buffer.byteLength(JSON.stringify(result), 'utf8') <= QUERY_SNAPSHOT_MAX_BYTES);
  assert.deepEqual(result.clientState.queries.map((item) => item.queryKey[1]), ['newest', 'small']);
});

test('skips an individually oversized query while preserving smaller recent results', () => {
  const source = client([query('oversized', 'x'.repeat(QUERY_SNAPSHOT_MAX_BYTES)), query('small', 'ok', now - 1)]);
  assert.deepEqual(boundQuerySnapshot(source, now).clientState.queries.map((item) => item.queryKey[1]), ['small']);
});

test('both serialization and old snapshot restoration apply bounds without changing the cache version', () => {
  const source = client(Array.from({ length: 105 }, (_, index) => query(index,
    { pages: [1, 2, 3], pageParams: [0, 1, 2] }, now - index)), [{ state: { isPaused: true } }]);
  for (const snapshot of [JSON.parse(serializeQuerySnapshot(source)), deserializeQuerySnapshot(JSON.stringify(source))]) {
    assert.equal(snapshot.buster, source.buster);
    assert.equal(snapshot.timestamp, source.timestamp);
    assert.equal(snapshot.clientState.queries.length, 100);
    assert.deepEqual(snapshot.clientState.mutations, []);
    assert.ok(snapshot.clientState.queries.every((item) => item.state.data.pages.length === 2));
  }
});

test('does not restore unmarked, unfinished, or invalid-timestamp queries from old snapshots', () => {
  const unmarked = query('unmarked'); delete unmarked.meta;
  const pending = query('pending'); pending.state.status = 'pending';
  const source = client([unmarked, pending, query('empty', {}, 0), query('valid')]);
  assert.deepEqual(boundQuerySnapshot(source, now).clientState.queries.map((item) => item.queryKey[1]), ['valid']);
});

test('rejects malformed JSON and metadata that alone exceeds the size budget', () => {
  assert.throws(() => deserializeQuerySnapshot('{broken'));
  assert.throws(() => boundQuerySnapshot({ ...client([]), buster: 'x'.repeat(QUERY_SNAPSHOT_MAX_BYTES) }, now),
    /metadata exceeds/);
});
