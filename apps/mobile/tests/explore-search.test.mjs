import assert from 'node:assert/strict';
import test from 'node:test';

import {
  exploreChannelMeta,
  exploreSearchKindLabel,
  exploreSearchTabId,
  exploreSearchTotal,
  exploreSearchUnit,
  parseExploreSearchTab,
} from '../src/features/discover/explore-search.ts';

test('search tabs encode character and person without overwriting subject type', () => {
  assert.equal(exploreSearchTabId('subject', 1), 1);
  assert.equal(exploreSearchTabId('character', 2), 100);
  assert.equal(exploreSearchTabId('person', 2), 101);
  assert.deepEqual(parseExploreSearchTab(3), {
    mode: 'subject',
    subjectType: 3,
  });
  assert.deepEqual(parseExploreSearchTab(100), { mode: 'character' });
  assert.deepEqual(parseExploreSearchTab(101), { mode: 'person' });
});

test('search copy follows the active mode instead of tab-id conditionals', () => {
  assert.equal(exploreSearchKindLabel('subject', 2), '动画');
  assert.equal(exploreSearchKindLabel('character', 2), '角色');
  assert.equal(exploreSearchKindLabel('person', 2), '人物');
  assert.equal(exploreSearchUnit('subject'), '条目');
  assert.equal(exploreSearchUnit('character'), '角色');
  assert.equal(exploreChannelMeta(1), '阅读频道 · 热门与高分精选');
  assert.equal(exploreChannelMeta(2), '动画频道 · 热门与高分精选');
});

test('people search hides a total until the first page actually arrives', () => {
  assert.equal(exploreSearchTotal('subject', undefined, 0), 0);
  assert.equal(exploreSearchTotal('subject', 12, 0), 12);
  assert.equal(exploreSearchTotal('character', 8, 0), 0);
  assert.equal(exploreSearchTotal('character', 8, 3), 8);
});
