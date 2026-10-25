import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createStartupTiming } from '../src/lib/startup-timing.ts';

test('startup stages are independent, measured from the same origin and recorded only once', () => {
  let now = 100;
  const timing = createStartupTiming(() => now);
  assert.deepEqual(timing.snapshot(), {});
  now = 112.4; timing.markFirstLayout();
  assert.deepEqual(timing.snapshot(), { firstLayoutMs: 12 });
  now = 150; timing.markCacheRestored();
  now = 220; timing.markHomeReady('empty');
  now = 999; timing.markFirstLayout(); timing.markCacheRestored(); timing.markHomeReady('content');
  assert.deepEqual(timing.snapshot(), { firstLayoutMs: 12, cacheRestoredMs: 50, homeReadyMs: 120, homeState: 'empty' });
});

test('a deep link can finish restoration without falsely claiming the home screen is ready', () => {
  let now = 0;
  const timing = createStartupTiming(() => now);
  now = 45; timing.markCacheRestored();
  assert.deepEqual(timing.snapshot(), { cacheRestoredMs: 45 });
});
