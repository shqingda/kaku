import assert from 'node:assert/strict';
import test from 'node:test';

import {
  bangumiDiscussionReplySchema,
  bangumiGroupTopicPageSchema,
  bangumiSubjectTopicPageSchema,
  bangumiUserTimelineSchema,
} from '../src/infrastructure/bangumi/api-next/schemas.ts';
import {
  bangumiPublicUserSchema,
  bangumiSubjectSchema,
} from '../src/infrastructure/bangumi/api-v0/schemas.ts';

const user = { id: 1, nickname: '魂', username: 'soul' };

function parseOrThrow(schema, value) {
  const result = schema.safeParse(value);
  assert.ok(result.success, JSON.stringify(result.error?.issues));
  return result.data;
}

test('bangumiDiscussionReplySchema parses nested replies and rejects missing content', () => {
  parseOrThrow(bangumiDiscussionReplySchema, {
    content: 'hello',
    createdAt: 1_785_940_000,
    creatorID: 1,
    id: 5,
    replies: [{ content: 'child', createdAt: 1_785_940_001, creatorID: 2, id: 6 }],
    user: { avatar: { small: 'https://lain.bgm.tv/a.jpg' }, ...user },
  });

  assert.equal(
    bangumiDiscussionReplySchema.safeParse({ createdAt: 1, creatorID: 1, id: 5 })
      .success,
    false,
  );
});

test('bangumiSubjectTopicPageSchema parses a topic page', () => {
  const data = parseOrThrow(bangumiSubjectTopicPageSchema, {
    data: [
      {
        createdAt: 1,
        creator: user,
        creatorID: 1,
        id: 10,
        parentID: 100,
        replyCount: 3,
        title: '标题',
        updatedAt: 2,
      },
    ],
    total: 1,
  });

  assert.equal(data.data[0].replyCount, 3);
  assert.equal(
    bangumiSubjectTopicPageSchema.safeParse({ data: [], total: 'x' }).success,
    false,
  );
});

test('bangumiSubjectSchema parses a catalog subject and rejects a missing name', () => {
  const data = parseOrThrow(bangumiSubjectSchema, {
    eps: 12,
    id: 100,
    images: { large: 'https://lain.bgm.tv/c.jpg' },
    name: 'Name',
    name_cn: '名字',
    summary: '简介',
    total_episodes: 12,
    type: 2,
  });

  assert.equal(data.name_cn, '名字');
  assert.equal(
    bangumiSubjectSchema.safeParse({ eps: 12, id: 100, summary: '', total_episodes: 12, type: 2 })
      .success,
    false,
  );
});

test('bangumiPublicUserSchema parses a profile and rejects a missing username', () => {
  const data = parseOrThrow(bangumiPublicUserSchema, {
    avatar: { small: 'https://lain.bgm.tv/a.jpg' },
    id: 1,
    nickname: '魂',
    sign: '签名',
    username: 'soul',
  });

  assert.equal(data.sign, '签名');
  assert.equal(
    bangumiPublicUserSchema.safeParse({ id: 1, nickname: '魂', sign: '' })
      .success,
    false,
  );
});

test('bangumiGroupTopicPageSchema parses a group topic page', () => {
  const data = parseOrThrow(bangumiGroupTopicPageSchema, {
    data: [
      {
        createdAt: 1,
        creatorID: 1,
        id: 20,
        parentID: 9,
        replyCount: 0,
        title: '话题',
        updatedAt: 2,
      },
    ],
    total: 1,
  });

  assert.equal(data.data[0].parentID, 9);
  assert.equal(
    bangumiGroupTopicPageSchema.safeParse({ data: [{}], total: 1 }).success,
    false,
  );
});

test('bangumiUserTimelineSchema tolerates an empty memo', () => {
  const data = parseOrThrow(bangumiUserTimelineSchema, [
    { createdAt: 1, id: 5, memo: {} },
  ]);

  assert.equal(data.length, 1);
  assert.equal(
    bangumiUserTimelineSchema.safeParse([{ createdAt: 1, memo: {} }]).success,
    false,
  );
});
