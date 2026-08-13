import assert from 'node:assert/strict';
import test from 'node:test';

import {
  containsBangumiEmoji,
  getBangumiEmojiUrl,
  parseBangumiEmoji,
} from '../src/lib/bangumi-emoji.ts';

test('bangumi stickers split text into text and emoji segments', () => {
  assert.deepEqual(parseBangumiEmoji('你好 (bgm38) 再见'), [
    { type: 'text', value: '你好 ' },
    { type: 'emoji', value: '(bgm38)' },
    { type: 'text', value: ' 再见' },
  ]);
});

test('plain text has no emoji segments', () => {
  assert.deepEqual(parseBangumiEmoji('普通文本'), [
    { type: 'text', value: '普通文本' },
  ]);
  assert.equal(containsBangumiEmoji('普通文本'), false);
  assert.equal(containsBangumiEmoji('(bgm38)'), true);
});

test('tv stickers map to the tv gif directory', () => {
  assert.equal(
    getBangumiEmojiUrl('(bgm38)'),
    'https://lain.bgm.tv/img/smiles/tv/15.gif',
  );
  // (bgm24) -> id 40 -> tv/01.gif（个位数补零）
  assert.equal(
    getBangumiEmojiUrl('(bgm24)'),
    'https://lain.bgm.tv/img/smiles/tv/01.gif',
  );
});

test('small bgm stickers map to the bgm directory', () => {
  assert.equal(
    getBangumiEmojiUrl('(bgm1)'),
    'https://lain.bgm.tv/img/smiles/bgm/1.png',
  );
  assert.equal(
    getBangumiEmojiUrl('(bgm11)'),
    'https://lain.bgm.tv/img/smiles/bgm/11.gif',
  );
  assert.equal(
    getBangumiEmojiUrl('(bgm23)'),
    'https://lain.bgm.tv/img/smiles/bgm/23.gif',
  );
});

test('ascii emoticons map to the smile gif directory', () => {
  assert.equal(
    getBangumiEmojiUrl('(=w=)'),
    'https://lain.bgm.tv/img/smiles/2.gif',
  );
});

test('unknown stickers return null', () => {
  assert.equal(getBangumiEmojiUrl('(bgm999)'), null);
});
