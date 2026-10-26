import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_HTML_BYTES,
  decodeEntities,
  htmlToText,
  parseBangumiTime,
  readBoundedHtml,
  secureUrl,
  toBangumiUnixTime,
} from '../src/bangumi-html.ts';

test('decodeEntities only decodes entities and decodes &amp; last', () => {
  assert.equal(
    decodeEntities('&#21704;&#x54C8;&nbsp;&quot;&#39;&apos;&lt;b&gt;&amp;lt;'),
    '哈哈 "\'\'<b>&lt;',
  );
  assert.equal(decodeEntities('<b>a</b>  b'), '<b>a</b>  b');
});

test('htmlToText strips tags before decoding and collapses whitespace', () => {
  assert.equal(htmlToText('  <p>a</p>\n<b>&lt;b&gt;</b>  c '), 'a <b> c');
  assert.equal(htmlToText('a<br>b<br/>c'), 'a b c');
  assert.equal(htmlToText('a<br>b', { lineBreaks: false }), 'ab');
});

test('secureUrl upgrades http and protocol-relative URLs', () => {
  assert.equal(secureUrl(undefined), undefined);
  assert.equal(secureUrl(''), undefined);
  assert.equal(secureUrl('//lain.bgm.tv/a.jpg'), 'https://lain.bgm.tv/a.jpg');
  assert.equal(secureUrl('http://lain.bgm.tv/a.jpg'), 'https://lain.bgm.tv/a.jpg');
  assert.equal(secureUrl('/img/a.jpg'), '/img/a.jpg');
});

test('Bangumi times are read as Beijing time', () => {
  const expected = Date.UTC(2026, 9, 26, 4, 5) / 1000;
  assert.equal(parseBangumiTime('发表于 2026-10-26 12:05'), expected);
  assert.equal(parseBangumiTime('no time'), 0);
  assert.equal(toBangumiUnixTime('2026-10-26 12:05'.match(/(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})/)), expected);
});

test('readBoundedHtml returns the body and stops past the size limit', async () => {
  assert.equal(await readBoundedHtml(new Response('<p>ok</p>'), () => new Error('large')), '<p>ok</p>');
  assert.equal(await readBoundedHtml(new Response(null), () => new Error('large')), '');
  await assert.rejects(
    readBoundedHtml(new Response('x'.repeat(MAX_HTML_BYTES + 1)), () => new Error('large')),
    /large/,
  );
});
