import assert from 'node:assert/strict';
import test from 'node:test';

import { EMOJI_CATEGORIES, PICKER_EMOJI } from '../src/features/emoji-picker/emoji-catalog.ts';

test('emoji categories keep the Stage1st-style group order', () => {
  assert.deepEqual(
    EMOJI_CATEGORIES.map((category) => category.key),
    ['ascii', 'classic', 'more'],
  );
  assert.deepEqual(
    EMOJI_CATEGORIES.map((category) => category.label),
    ['颜文字', '经典', '更多'],
  );
});

test('classic and more groups cover bgm01 through bgm123', () => {
  const classic = EMOJI_CATEGORIES[1].items;
  const more = EMOJI_CATEGORIES[2].items;

  assert.equal(classic.length, 23);
  assert.equal(classic[0].sticker, '(bgm01)');
  assert.equal(classic.at(-1).sticker, '(bgm23)');

  assert.equal(more.length, 100);
  assert.equal(more[0].sticker, '(bgm24)');
  assert.equal(more.at(-1).sticker, '(bgm123)');
});

test('every picker emoji resolves to a gif url and stickers stay unique', () => {
  const stickers = new Set();

  for (const emoji of PICKER_EMOJI) {
    assert.equal(typeof emoji.url, 'string');
    assert.ok(emoji.url.startsWith('https://'), emoji.url);
    assert.ok(
      emoji.url.endsWith('.gif') || emoji.url.endsWith('.png'),
      emoji.url,
    );
    stickers.add(emoji.sticker);
  }

  assert.equal(stickers.size, PICKER_EMOJI.length);
});

test('PICKER_EMOJI is the flatMap of all categories in order', () => {
  const flattened = EMOJI_CATEGORIES.flatMap((category) => category.items);

  assert.deepEqual(PICKER_EMOJI, flattened);
  assert.ok(PICKER_EMOJI.length > 100);
});
