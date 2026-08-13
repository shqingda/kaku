import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cleanBangumiContent,
  parseBangumiContent,
} from '../src/lib/bangumi-content.ts';

test('cleanBangumiContent strips bbcode tags', () => {
  assert.equal(
    cleanBangumiContent('[b]加粗[/b] 普通 [url=https://x]链接[/url]'),
    '加粗 普通 链接',
  );
});

test('parseBangumiContent keeps quote blocks separate', () => {
  assert.deepEqual(parseBangumiContent('我的回复 [quote]引用的部分[/quote] 后面的话'), [
    { type: 'text', value: '我的回复' },
    { type: 'quote', value: '引用的部分' },
    { type: 'text', value: '后面的话' },
  ]);
});

test('parseBangumiContent returns plain text when no quote', () => {
  assert.deepEqual(parseBangumiContent('普通回复'), [
    { type: 'text', value: '普通回复' },
  ]);
});

test('parseBangumiContent handles a leading quote', () => {
  assert.deepEqual(parseBangumiContent('[quote]开头引用[/quote]正文'), [
    { type: 'quote', value: '开头引用' },
    { type: 'text', value: '正文' },
  ]);
});

test('parseBangumiContent strips inner bbcode inside quotes', () => {
  assert.deepEqual(parseBangumiContent('[quote][b]加粗[/b]引用[/quote]'), [
    { type: 'quote', value: '加粗引用' },
  ]);
});
