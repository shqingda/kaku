import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getSearchDraft,
  setSearchDraft,
  subscribeSearchDraft,
} from '../src/features/search/search-draft.ts';

test('search draft notifies subscribers and can be cleared', () => {
  setSearchDraft('');
  const seen = [];
  const unsubscribe = subscribeSearchDraft(() => {
    seen.push(getSearchDraft());
  });

  setSearchDraft('芙莉莲');
  setSearchDraft('芙莉莲');
  setSearchDraft('');

  unsubscribe();
  assert.deepEqual(seen, ['芙莉莲', '']);
  assert.equal(getSearchDraft(), '');
});
