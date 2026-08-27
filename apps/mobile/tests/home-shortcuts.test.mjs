import assert from 'node:assert/strict';
import test from 'node:test';

import { HOME_SHORTCUTS } from '../src/features/quick-actions/home-shortcuts.ts';

test('home screen shortcuts cover four in-app destinations', () => {
  assert.equal(HOME_SHORTCUTS.length, 4);
  assert.deepEqual(
    HOME_SHORTCUTS.map((item) => item.href),
    ['/calendar', '/explore', '/rankings', '/browse'],
  );
  assert.equal(new Set(HOME_SHORTCUTS.map((item) => item.id)).size, 4);
});
