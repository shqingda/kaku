import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isBlockedUser,
  withoutBlockedAuthors,
  withoutBlockedReplies,
} from '../src/features/users/blocked-content.ts';

const reply = (id, authorId, replyTo) => ({
  author: `用户 ${authorId}`, authorId, body: `内容 ${id}`, createdAt: '刚刚', id, replyTo,
});

test('rows without a known author stay visible', () => {
  assert.equal(isBlockedUser(undefined, new Set([1])), false);
  const items = [{ authorId: 1 }, {}, { authorId: 2 }];
  assert.deepEqual(withoutBlockedAuthors(items, new Set([1])), [{}, { authorId: 2 }]);
});

test('an empty blocklist keeps the same arrays', () => {
  const items = [{ authorId: 1 }];
  const replies = [reply('1', 1)];
  assert.equal(withoutBlockedAuthors(items, new Set()), items);
  assert.equal(withoutBlockedReplies(replies, new Set()), replies);
});

test('hiding a reply also removes quotes of it but keeps other quotes', () => {
  const replies = [
    reply('1', 1),
    reply('2', 2, { author: '用户 1', body: '被屏蔽的原文', replyId: '1' }),
    reply('3', 3, { author: '用户 2', body: '正常引用', replyId: '2' }),
  ];
  const visible = withoutBlockedReplies(replies, new Set([1]));

  assert.deepEqual(visible.map((item) => item.id), ['2', '3']);
  assert.deepEqual(visible.map((item) => item.floor), [2, 3]);
  assert.equal(visible[0].replyTo, undefined);
  assert.equal(visible[1].replyTo?.replyId, '2');
  assert.equal(JSON.stringify(visible).includes('被屏蔽的原文'), false);
});
