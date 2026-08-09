import type { UsersProvider } from '@/features/users/model';
import type { CollectionStatus } from '@/features/watching/model';

import {
  getBangumiPublicUser,
  getBangumiUserCollections,
  getBangumiUserEntityCollections,
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
  toPublicUserEntityCollectionPage,
  toPublicTimelinePage,
} from './adapter';

const COLLECTION_TYPE: Record<CollectionStatus, number> = {
  completed: 2,
  doing: 3,
  dropped: 5,
  onHold: 4,
  wish: 1,
};

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
  async getPublicUserCollections(
    username,
    subjectType,
    offset,
    collectionStatus,
    signal,
  ) {
    const collections = await getBangumiUserCollections(
      username,
      subjectType,
      offset,
      collectionStatus ? COLLECTION_TYPE[collectionStatus] : undefined,
      signal,
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
  async getPublicUserEntities(username, kind, signal) {
    const entities = await getBangumiUserEntityCollections(
      username,
      kind,
      signal,
    );
    return toPublicUserEntityCollectionPage(entities, kind);
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
