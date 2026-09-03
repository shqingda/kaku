import assert from 'node:assert/strict';
import test from 'node:test';

import { HOME_SHORTCUTS } from '../src/features/quick-actions/home-shortcuts.ts';

test('the home screen exposes exactly four shortcuts in a fixed order', () => {
  assert.deepEqual(
    HOME_SHORTCUTS.map((shortcut) => shortcut.id),
    ['calendar', 'search', 'rankings', 'browse'],
  );
});

test('every shortcut points at an app route that starts with a slash', () => {
  for (const shortcut of HOME_SHORTCUTS) {
    assert.equal(shortcut.href.startsWith('/'), true, shortcut.id);
  }
  assert.deepEqual(
    HOME_SHORTCUTS.map((shortcut) => shortcut.href),
    ['/calendar', '/explore', '/rankings', '/browse'],
  );
});

test('every shortcut carries titles, subtitles and icons for both platforms', () => {
  for (const shortcut of HOME_SHORTCUTS) {
    assert.equal(shortcut.title.length > 0, true, shortcut.id);
    assert.equal(shortcut.subtitle.length > 0, true, shortcut.id);
    assert.equal(shortcut.iosIcon.length > 0, true, shortcut.id);
    assert.equal(shortcut.androidIcon.length > 0, true, shortcut.id);
  }
});
