import assert from 'node:assert/strict';
import test from 'node:test';

import {
  mapBangumiComments,
  mapBangumiReviewDetail,
  mapBangumiReviews,
} from '../src/infrastructure/bangumi/reviews/adapter.ts';
import { mapBangumiEntityDetail } from '../src/infrastructure/bangumi/people/adapter.ts';
import { mapBangumiSubjectCharacters } from '../src/infrastructure/bangumi/subject-extras/adapter.ts';
import { getRemainingPageOffsets } from '../src/infrastructure/bangumi/subject-extras/pagination.ts';
import {
  bangumiDiscussionReplySchema,
} from '../src/infrastructure/bangumi/api-next/schemas.ts';
import { resizeWatchedEpisodes } from '../src/features/watching/progress.ts';
import { formatActivityTime } from '../src/lib/format-activity-time.ts';

test('formatActivityTime keeps the original three display ranges', () => {
  const now = new Date(2026, 6, 24, 12, 0).getTime();

  assert.equal(formatActivityTime(now / 1000 - 3 * 3600 - 40 * 60, now), '3 小时 40 分钟前');
  assert.equal(formatActivityTime(now / 1000 - 2 * 86400 - 23 * 3600, now), '2 天 23 小时前');
  assert.match(formatActivityTime(now / 1000 - 3 * 86400, now), /^2026-7-21 12:00$/);
});

test('resizeWatchedEpisodes preserves manual gaps while changing the count', () => {
  assert.deepEqual(resizeWatchedEpisodes([1, 3, 5], 4, 6), [1, 2, 3, 5]);
  assert.deepEqual(resizeWatchedEpisodes([1, 3, 5], 2, 6), [1, 3]);
  assert.deepEqual(resizeWatchedEpisodes([0, 1, 99], 9, 3), [1, 2, 3]);
});

test('Bangumi comments and reviews map into separate domain models', () => {
  const user = { id: 1, nickname: '', username: 'alice' };
  const comments = mapBangumiComments({
    data: [{ comment: '好看', id: 2, rate: 0, updatedAt: 10, user }],
    total: 1,
  });
  const reviews = mapBangumiReviews({
    data: [
      {
        entry: {
          createdAt: 20,
          id: 3,
          replies: 4,
          summary: '摘要',
          title: '长评',
        },
        id: 30,
        user,
      },
    ],
    total: 1,
  });

  assert.deepEqual(comments.items[0], {
    author: 'alice',
    authorUsername: 'alice',
    body: '好看',
    id: '2',
    rating: undefined,
    updatedAt: 10,
  });
  assert.deepEqual(reviews.items[0], {
    author: 'alice',
    authorUsername: 'alice',
    id: '3',
    replyCount: 4,
    summary: '摘要',
    title: '长评',
    updatedAt: 20,
  });
});

test('Bangumi review detail keeps its body and replies together', () => {
  const user = { id: 1, nickname: 'Alice', username: 'alice' };
  const replies = [
    { author: 'Bob', body: '同意', createdAt: '3h ago', id: '9' },
  ];
  const review = mapBangumiReviewDetail(
    {
      content: '接口原文',
      createdAt: 10,
      id: 3,
      replies: 1,
      title: '长评',
      updatedAt: 20,
      user,
    },
    '清理后的正文',
    replies,
  );

  assert.equal(review.body, '清理后的正文');
  assert.equal(review.author, 'Alice');
  assert.equal(review.replyCount, 1);
  assert.deepEqual(review.replies, replies);
});

test('Bangumi nested replies parse recursively', () => {
  const parsed = bangumiDiscussionReplySchema.parse({
    content: '第一层回复',
    createdAt: 10,
    creatorID: 1,
    id: 100,
    replies: [
      {
        content: '第二层回复',
        createdAt: 20,
        creatorID: 2,
        id: 101,
      },
    ],
  });

  assert.equal(parsed.replies?.length, 1);
  assert.equal(parsed.replies?.[0].content, '第二层回复');
});

test('Bangumi people adapter groups repeated roles by person or character', () => {
  const detail = {
    gender: 'male',
    id: 1,
    infobox: [
      { key: '性别', value: '男' },
      { key: '生日', value: '12月5日' },
    ],
    name: '测试角色',
    stat: { collects: 12, comments: 3 },
    summary: '',
    type: 1,
  };
  const peers = [
    {
      id: 9,
      name: '测试声优',
      staff: '主角',
      subject_id: 10,
      subject_name: 'Work A',
      subject_name_cn: '作品 A',
      subject_type: 2,
      type: 1,
    },
    {
      id: 9,
      name: '测试声优',
      staff: '配角',
      subject_id: 11,
      subject_name: 'Work B',
      subject_name_cn: '',
      subject_type: 2,
      type: 1,
    },
  ];
  const mapped = mapBangumiEntityDetail(detail, [], peers, 'character');

  assert.deepEqual(mapped.categoryLabels, ['角色']);
  assert.equal(mapped.collectionCount, 12);
  assert.equal(mapped.commentCount, 3);
  assert.equal(mapped.relatedPeers.length, 1);
  assert.equal(mapped.relatedPeers[0].name, '测试声优');
  assert.deepEqual(mapped.metadata, [
    { label: '性别', value: '男' },
    { label: '生日', value: '12月5日' },
  ]);
  assert.deepEqual(mapped.relatedPeers[0].appearances, [
    { relation: '主角', subjectId: 10, subjectTitle: '作品 A' },
    { relation: '配角', subjectId: 11, subjectTitle: 'Work B' },
  ]);
});

test('Bangumi subject characters prefer localized Chinese names', () => {
  const characters = [
    {
      actors: [],
      id: 1,
      name: '長い日本語のキャラクター名',
      relation: '主角',
      summary: '',
    },
    {
      actors: [],
      id: 2,
      name: 'フォールバック名',
      relation: '配角',
      summary: '',
    },
  ];

  const mapped = mapBangumiSubjectCharacters(characters, [
    { id: 1, nameCN: '简体中文角色名' },
    { id: 2, nameCN: '   ' },
  ]);

  assert.equal(mapped[0].name, '简体中文角色名');
  assert.equal(mapped[1].name, 'フォールバック名');
});

test('subject character names request every page above 100 entries', () => {
  assert.deepEqual(getRemainingPageOffsets(0, 100), []);
  assert.deepEqual(getRemainingPageOffsets(100, 100), []);
  assert.deepEqual(getRemainingPageOffsets(101, 100), [100]);
  assert.deepEqual(getRemainingPageOffsets(301, 100), [100, 200, 300]);
});

test('Bangumi comments and reviews expose the next offset', () => {
  const user = { id: 1, nickname: 'Alice', username: 'alice' };
  const comments = mapBangumiComments(
    {
      data: [{ comment: '好看', id: 2, rate: 0, updatedAt: 10, user }],
      total: 12,
    },
    10,
  );
  const reviews = mapBangumiReviews(
    {
      data: [
        {
          entry: {
            createdAt: 20,
            id: 3,
            replies: 0,
            summary: '',
            title: '长评',
          },
          id: 30,
          user,
        },
      ],
      total: 11,
    },
    10,
  );

  assert.equal(comments.nextOffset, 11);
  assert.equal(reviews.nextOffset, undefined);
});
