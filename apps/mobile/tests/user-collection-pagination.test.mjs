import assert from 'node:assert/strict';
import test from 'node:test';

import {
  toPublicUserBlogPage,
  toPublicUserCollectionPage,
  toPublicUserFriendPage,
} from '../src/infrastructure/bangumi/users/adapter.ts';

const collection = {
  ep_status: 8,
  rate: 9,
  subject: {
    eps: 28,
    id: 400602,
    images: { common: 'http://lain.bgm.tv/frieren.jpg' },
    name: 'Sousou no Frieren',
    name_cn: '葬送的芙莉莲',
    rank: 40,
    score: 8.5,
  },
  type: 3,
  updated_at: '2026-07-28T10:00:00+08:00',
};

test('public user collection page maps progress and next offset', () => {
  const page = toPublicUserCollectionPage({
    data: [collection],
    limit: 20,
    offset: 20,
    total: 42,
  });

  assert.equal(page.nextOffset, 21);
  assert.equal(page.total, 42);
  assert.deepEqual(page.items[0], {
    coverUrl: 'https://lain.bgm.tv/frieren.jpg',
    id: 400602,
    progress: 8,
    rate: 9,
    status: '在看',
    title: '葬送的芙莉莲',
    totalEpisodes: 28,
    updatedAt: '2026-07-28T10:00:00+08:00',
  });
});

test('public user collection page has no next offset at the end', () => {
  const page = toPublicUserCollectionPage({
    data: [collection],
    limit: 20,
    offset: 41,
    total: 42,
  });

  assert.equal(page.nextOffset, undefined);
});

test('public user blog page maps its next offset', () => {
  const page = toPublicUserBlogPage(
    {
      data: [
        {
          createdAt: 100,
          id: 273601,
          public: true,
          replies: 12,
          summary: '日志摘要',
          title: '日志标题',
          updatedAt: 200,
        },
      ],
      total: 12,
    },
    10,
  );

  assert.equal(page.nextOffset, 11);
  assert.equal(page.total, 12);
  assert.deepEqual(page.items[0], {
    id: 273601,
    replyCount: 12,
    summary: '日志摘要',
    title: '日志标题',
    updatedAt: 200,
  });
});

test('public user friend page maps avatars and stops at the end', () => {
  const page = toPublicUserFriendPage(
    {
      data: [
        {
          avatar: {
            medium: 'http://lain.bgm.tv/pic/user/m/1.jpg',
          },
          id: 1,
          nickname: 'Sai',
          sign: '',
          username: 'sai',
        },
      ],
      total: 21,
    },
    20,
  );

  assert.equal(page.nextOffset, undefined);
  assert.deepEqual(page.items[0], {
    avatarUrl: 'https://lain.bgm.tv/pic/user/m/1.jpg',
    nickname: 'Sai',
    username: 'sai',
  });
});
