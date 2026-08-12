import assert from 'node:assert/strict';
import test from 'node:test';

import { mapBangumiTopicContent } from '../src/infrastructure/bangumi/discussions/adapter.ts';

const author = {
  id: 7,
  nickname: '楼主',
  username: 'owner',
};

function reply(id, content, overrides = {}) {
  return {
    content,
    createdAt: 1_700_000_000,
    creator: author,
    creatorID: author.id,
    id,
    ...overrides,
  };
}

test('将可靠识别的首条楼主回复提升为话题正文', () => {
  const content = mapBangumiTopicContent({
    createdAt: 1_700_000_000,
    creatorID: author.id,
    replies: [
      reply(100, '[b]正文[/b]', {
        replies: [reply(101, '回复正文', { createdAt: 1_700_000_100 })],
      }),
      reply(102, '普通回复', { createdAt: 1_700_000_200 }),
    ],
    replyCount: 2,
  });

  assert.equal(content.body, '正文');
  assert.deepEqual(
    content.replies.map((item) => item.id),
    ['101', '102'],
  );
  assert.equal(content.replies[0]?.replyTo?.replyId, '100');
});

test('回复数量不符合正文特征时保留第一条回复', () => {
  const content = mapBangumiTopicContent({
    createdAt: 1_700_000_000,
    creatorID: author.id,
    replies: [reply(100, '看起来像正文'), reply(101, '普通回复')],
    replyCount: 2,
  });

  assert.equal(content.body, undefined);
  assert.deepEqual(
    content.replies.map((item) => item.id),
    ['100', '101'],
  );
});

test('第一条不是楼主本人时不会误删', () => {
  const content = mapBangumiTopicContent({
    createdAt: 1_700_000_000,
    creatorID: author.id,
    replies: [
      reply(100, '其他用户的回复', { creatorID: 99 }),
      reply(101, '普通回复'),
    ],
    replyCount: 1,
  });

  assert.equal(content.body, undefined);
  assert.deepEqual(
    content.replies.map((item) => item.id),
    ['100', '101'],
  );
});
