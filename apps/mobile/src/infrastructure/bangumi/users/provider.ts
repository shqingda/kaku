import type {
  PublicTimelinePage,
  PublicUserBlogPage,
  PublicUserCollectionPage,
  PublicUserEntityCollectionPage,
  PublicUserEntityKind,
  PublicUserFriendPage,
  PublicUserProfile,
} from '@/features/users/model';
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

export async function getPublicUser(
  username: string,
  signal?: AbortSignal,
): Promise<PublicUserProfile> {
  const profile = await getBangumiPublicUser(username, signal);

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
}

export async function getPublicUserCollections(
  username: string,
  subjectType: number,
  offset: number,
  collectionStatus?: CollectionStatus,
  signal?: AbortSignal,
): Promise<PublicUserCollectionPage> {
  const collections = await getBangumiUserCollections(
    username,
    subjectType,
    offset,
    collectionStatus ? COLLECTION_TYPE[collectionStatus] : undefined,
    signal,
  );
  return toPublicUserCollectionPage(collections, subjectType);
}

export async function getPublicUserBlogs(
  username: string,
  offset: number,
  signal?: AbortSignal,
): Promise<PublicUserBlogPage> {
  const blogs = await getBangumiUserBlogs(username, offset, signal);
  return toPublicUserBlogPage(blogs, offset);
}

export async function getPublicUserFriends(
  username: string,
  offset: number,
  signal?: AbortSignal,
): Promise<PublicUserFriendPage> {
  const friends = await getBangumiUserFriends(username, offset, signal);
  return toPublicUserFriendPage(friends, offset);
}

export async function getPublicUserEntities(
  username: string,
  kind: PublicUserEntityKind,
  signal?: AbortSignal,
): Promise<PublicUserEntityCollectionPage> {
  const entities = await getBangumiUserEntityCollections(
    username,
    kind,
    signal,
  );
  return toPublicUserEntityCollectionPage(entities, kind);
}

export async function getPublicUserTimeline(
  username: string,
  cursor?: string,
  signal?: AbortSignal,
): Promise<PublicTimelinePage> {
  const limit = 10;
  const timeline = await getBangumiUserTimeline(
    username,
    cursor === undefined ? undefined : Number(cursor),
    limit,
    signal,
  );
  return toPublicTimelinePage(timeline, limit);
}
