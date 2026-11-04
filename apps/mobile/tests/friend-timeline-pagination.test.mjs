import assert from 'node:assert/strict';
import test from 'node:test';

import { getFriendTimelinePath } from '../src/infrastructure/kaku/timeline-pagination.ts';

test('friend timeline forwards the Bangumi until cursor through Kaku', () => {
  assert.equal(getFriendTimelinePath(), '/me/timeline');
  // A persisted first-page cursor is restored from JSON as null.
  assert.equal(getFriendTimelinePath(null), '/me/timeline');
  assert.equal(getFriendTimelinePath(42), '/me/timeline?until=42');
});
