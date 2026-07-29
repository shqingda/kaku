import type { UsersProvider } from '@/features/users/model';

import {
  getBangumiPublicUser,
  getBangumiUserCollections,
} from '../api-v0/client';
import {
  getBangumiUserBlogs,
  getBangumiUserFriends,
  getBangumiUserSocial,
  getBangumiUserTimeline,
} from '../api-next/client';
import {
  toPublicUserBlog,
  toPublicUserBlogPage,
  toPublicUserCollection,
  toPublicUserCollectionPage,
  toPublicUserFriend,
  toPublicUserFriendPage,
  toPublicTimelineItem,
  toPublicTimelinePage,
} from './adapter';

export const bangumiUsersProvider: UsersProvider = {
  async getPublicUser(username) {
    const [{ collections, profile }, blogs, social] = await Promise.all([
      getBangumiPublicUser(username),
      getBangumiUserBlogs(username),
      getBangumiUserSocial(username),
    ]);

    return {
      avatarUrl:
        profile.avatar?.large ??
        profile.avatar?.medium ??
        profile.avatar?.small,
      collections: collections.data.map(toPublicUserCollection),
      blogs: blogs.data.map(toPublicUserBlog),
      blogTotal: blogs.total,
      friends: social.friends.data.map(toPublicUserFriend),
      friendTotal: social.friends.total,
      collectionTotal: collections.total,
      id: profile.id,
      nickname: profile.nickname || profile.username,
      sign: profile.sign,
      timeline: social.timeline.map(toPublicTimelineItem),
      username: profile.username,
    };
  },
  async getPublicUserCollections(username, offset) {
    const collections = await getBangumiUserCollections(username, offset);
    return toPublicUserCollectionPage(collections);
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
