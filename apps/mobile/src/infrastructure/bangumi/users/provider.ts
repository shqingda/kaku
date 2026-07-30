import type { UsersProvider } from '@/features/users/model';

import {
  getBangumiPublicUser,
  getBangumiUserCollections,
} from '../api-v0/client';
import {
  getBangumiUserFriends,
  getBangumiUserBlogs,
  getBangumiUserTimeline,
} from '../api-next/client';
import {
  toPublicUserBlogPage,
  toPublicUserCollectionPage,
  toPublicUserFriendPage,
  toPublicTimelinePage,
} from './adapter';

export const bangumiUsersProvider: UsersProvider = {
  async getPublicUser(username) {
    const profile = await getBangumiPublicUser(username);

    return {
      avatarUrl:
        profile.avatar?.large ??
        profile.avatar?.medium ??
        profile.avatar?.small,
      id: profile.id,
      nickname: profile.nickname || profile.username,
      sign: profile.sign,
      username: profile.username,
    };
  },
  async getPublicUserCollections(username, subjectType, offset) {
    const collections = await getBangumiUserCollections(
      username,
      subjectType,
      offset,
    );
    return toPublicUserCollectionPage(collections, subjectType);
  },
  async getPublicUserBlogs(username, offset) {
    const blogs = await getBangumiUserBlogs(username, offset);
    return toPublicUserBlogPage(blogs, offset);
  },
  async getPublicUserFriends(username, offset) {
    const friends = await getBangumiUserFriends(username, offset);
    return toPublicUserFriendPage(friends, offset);
  },
  async getPublicUserTimeline(username, cursor) {
    const limit = 10;
    const timeline = await getBangumiUserTimeline(
      username,
      cursor === undefined ? undefined : Number(cursor),
      limit,
    );
    return toPublicTimelinePage(timeline, limit);
  },
};
