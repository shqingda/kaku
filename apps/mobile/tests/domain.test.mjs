import assert from 'node:assert/strict';
import test from 'node:test';

import {
  mapBangumiComments,
  mapBangumiReviewDetail,
  mapBangumiReviews,
} from '../src/infrastructure/bangumi/reviews/adapter.ts';
import {
  bangumiDiscussionReplySchema,
} from '../src/infrastructure/bangumi/api-next/schemas.ts';
import {
  changeCollectionStatus,
  changeRating,
  changeWatchedEpisodeCount,
  resizeWatchedEpisodes,
  shouldShowWatchProgress,
  toggleWatchedEpisode,
} from '../src/features/watching/progress.ts';
import { updateWatchingList } from '../src/features/watching/watching-list.ts';
import { formatActivityTime } from '../src/lib/format-activity-time.ts';

test('formatActivityTime keeps the original three display ranges', () => {
  const now = new Date(2026, 6, 24, 12, 0).getTime();

  assert.equal(formatActivityTime(now / 1000 - 3 * 3600 - 40 * 60, now), '3h 40m ago');
  assert.equal(formatActivityTime(now / 1000 - 2 * 86400 - 23 * 3600, now), '2d 23h ago');
  assert.match(formatActivityTime(now / 1000 - 3 * 86400, now), /^2026-7-21 12:00$/);
});

test('resizeWatchedEpisodes preserves manual gaps while changing the count', () => {
  assert.deepEqual(resizeWatchedEpisodes([1, 3, 5], 4, 6), [1, 2, 3, 5]);
  assert.deepEqual(resizeWatchedEpisodes([1, 3, 5], 2, 6), [1, 3]);
  assert.deepEqual(resizeWatchedEpisodes([0, 1, 99], 9, 3), [1, 2, 3]);
});

test('updateWatchingList adds, updates, and removes progress items', () => {
  const subject = {
    coverUrl: 'cover',
    episodeAirDates: [],
    id: 1,
    summary: '',
    title: '条目',
    totalEpisodes: 12,
    watchedEpisodeNumbers: [],
    year: 2026,
  };
  const added = updateWatchingList([], {
    ...subject,
    watchedEpisodeNumbers: [1],
  });
  const updated = updateWatchingList(added, {
    ...subject,
    watchedEpisodeNumbers: [1, 2],
  });
  const removed = updateWatchingList(updated, subject);

  assert.deepEqual(added[0].watchedEpisodeNumbers, [1]);
  assert.deepEqual(updated[0].watchedEpisodeNumbers, [1, 2]);
  assert.deepEqual(removed, []);
});

test('collection status retains items while rating requires an active status', () => {
  const subject = {
    coverUrl: 'cover',
    episodeAirDates: [],
    id: 1,
    summary: '',
    title: '条目',
    totalEpisodes: 12,
    watchedEpisodeNumbers: [],
    year: 2026,
  };
  const wished = updateWatchingList([], {
    ...subject,
    collectionStatus: 'wish',
  });
  const unratedWish = changeRating(wished[0], 8);
  const ratedDoing = changeRating(
    { ...subject, collectionStatus: 'doing' },
    8,
  );

  assert.equal(wished[0].collectionStatus, 'wish');
  assert.deepEqual(wished[0].watchedEpisodeNumbers, []);
  assert.equal(unratedWish.rating, undefined);
  assert.equal(ratedDoing.rating, 8);
});

test('watch progress starts watching while wish clears progress', () => {
  const subject = {
    collectionStatus: null,
    coverUrl: 'cover',
    episodeAirDates: [],
    id: 1,
    summary: '',
    title: '条目',
    totalEpisodes: 28,
    watchedEpisodeNumbers: [],
    year: 2026,
  };
  const progressed = changeWatchedEpisodeCount(subject, 2);
  const ratedProgressed = changeRating(progressed, 9);
  const wished = changeCollectionStatus(ratedProgressed, 'wish');
  const uncollected = changeCollectionStatus(ratedProgressed);
  const watchedOne = toggleWatchedEpisode(wished, 1);

  assert.equal(progressed.collectionStatus, 'doing');
  assert.deepEqual(progressed.watchedEpisodeNumbers, [1, 2]);
  assert.equal(wished.collectionStatus, 'wish');
  assert.deepEqual(wished.watchedEpisodeNumbers, []);
  assert.equal(wished.rating, undefined);
  assert.equal(uncollected.collectionStatus, null);
  assert.deepEqual(uncollected.watchedEpisodeNumbers, []);
  assert.equal(uncollected.rating, undefined);
  assert.equal(watchedOne.collectionStatus, 'doing');
  assert.deepEqual(watchedOne.watchedEpisodeNumbers, [1]);
});

test('watch progress is visible only after progress or an active collection state', () => {
  assert.equal(
    shouldShowWatchProgress({
      collectionStatus: null,
      totalEpisodes: 28,
      watchedCount: 0,
    }),
    false,
  );
  assert.equal(
    shouldShowWatchProgress({
      collectionStatus: 'wish',
      totalEpisodes: 28,
      watchedCount: 0,
    }),
    false,
  );

  for (const collectionStatus of [
    'completed',
    'doing',
    'onHold',
    'dropped',
  ]) {
    assert.equal(
      shouldShowWatchProgress({
        collectionStatus,
        totalEpisodes: 28,
        watchedCount: 0,
      }),
      true,
    );
  }
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
