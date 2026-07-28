import assert from 'node:assert/strict';
import test from 'node:test';

import { toPublicGroupTopicPage } from '../src/infrastructure/bangumi/community/adapter.ts';

const topic = {
  createdAt: 100,
  creator: {
    avatar: { medium: 'https://lain.bgm.tv/avatar.jpg' },
    id: 1,
    nickname: 'Alice',
    username: 'alice',
  },
  creatorID: 1,
  id: 99,
  parentID: 0,
  replyCount: 12,
  title: '小组话题',
  updatedAt: 200,
};

test('group topic page keeps its offset and group context', () => {
  const page = toPublicGroupTopicPage(
    { data: [topic], total: 52 },
    50,
    { name: 'anime', title: '补旧番' },
  );

  assert.equal(page.nextOffset, 51);
  assert.equal(page.total, 52);
  assert.deepEqual(page.items[0], {
    author: 'Alice',
    authorAvatarUrl: 'https://lain.bgm.tv/avatar.jpg',
    authorUsername: 'alice',
    groupName: 'anime',
    groupTitle: '补旧番',
    id: 99,
    replyCount: 12,
    title: '小组话题',
    updatedAt: 200,
  });
});

test('group topic page stops after its last item', () => {
  const page = toPublicGroupTopicPage(
    { data: [topic], total: 51 },
    50,
  );

  assert.equal(page.nextOffset, undefined);
});
