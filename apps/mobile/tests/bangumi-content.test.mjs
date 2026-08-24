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

test('parseBangumiContent extracts http(s) images as image blocks', () => {
  assert.deepEqual(
    parseBangumiContent('看图 [img]https://lain.bgm.tv/pic/a.jpg[/img] 不错'),
    [
      { type: 'text', value: '看图' },
      { type: 'image', value: 'https://lain.bgm.tv/pic/a.jpg' },
      { type: 'text', value: '不错' },
    ],
  );
});

test('parseBangumiContent keeps image and quote block order', () => {
  assert.deepEqual(
    parseBangumiContent(
      '[img]https://img.bgm.tv/pic/b.png[/img][quote]引用[/quote]',
    ),
    [
      { type: 'image', value: 'https://img.bgm.tv/pic/b.png' },
      { type: 'quote', value: '引用' },
    ],
  );
});

test('parseBangumiContent ignores non-http image targets and plain text', () => {
  assert.deepEqual(
    parseBangumiContent('[img]javascript:alert(1)[/img] 文本'),
    [{ type: 'text', value: 'javascript:alert(1) 文本' }],
  );
});
