import type { CollectionStatus } from '@/features/watching/model';

import type {
  PublicUserBlog,
  PublicUserBlogPage,
  PublicUserCollection,
  PublicUserCollectionPage,
  PublicUserFriend,
  PublicUserFriendPage,
  PublicTimelineItem,
  PublicTimelinePage,
} from '../../../features/users/model.ts';
import type {
  BangumiUserTimeline,
  BangumiUserBlogs,
  BangumiUserFriends,
} from '../api-next/schemas.ts';
import type { BangumiUserCollectionsResponse } from '../api-v0/schemas.ts';

const COLLECTION_STATUS: Record<number, CollectionStatus> = {
  1: 'wish',
  2: 'completed',
  3: 'doing',
  4: 'onHold',
  5: 'dropped',
};

function secureImage(url?: string) {
  return url?.replace(/^http:/, 'https:');
}

export function toPublicUserCollection(
  collection: BangumiUserCollectionsResponse['data'][number],
  subjectType: number,
): PublicUserCollection {
  return {
    collectionStatus: COLLECTION_STATUS[collection.type],
    coverUrl: secureImage(
      collection.subject.images?.common ??
        collection.subject.images?.medium ??
        collection.subject.images?.small,
    ),
    id: collection.subject.id,
    progress: collection.ep_status,
    rate: collection.rate > 0 ? collection.rate : undefined,
    subjectType,
    title:
      collection.subject.name_cn.trim() || collection.subject.name,
    totalEpisodes: collection.subject.eps,
    updatedAt: collection.updated_at,
  };
}

export function toPublicUserCollectionPage(
  response: BangumiUserCollectionsResponse,
  subjectType = 2,
): PublicUserCollectionPage {
  const nextOffset = response.offset + response.data.length;

  return {
    items: response.data.map((collection) =>
      toPublicUserCollection(collection, subjectType),
    ),
    nextOffset:
      nextOffset < response.total ? nextOffset : undefined,
    total: response.total,
  };
}

export function toPublicUserBlog(
  blog: BangumiUserBlogs['data'][number],
): PublicUserBlog {
  return {
    id: blog.id,
    replyCount: blog.replies,
    summary: blog.summary,
    title: blog.title,
    updatedAt: blog.updatedAt || blog.createdAt,
  };
}

export function toPublicUserBlogPage(
  response: BangumiUserBlogs,
  offset: number,
): PublicUserBlogPage {
  const nextOffset = offset + response.data.length;

  return {
    items: response.data.map(toPublicUserBlog),
    nextOffset:
      nextOffset < response.total ? nextOffset : undefined,
    total: response.total,
  };
}

export function toPublicUserFriend(
  friend: BangumiUserFriends['data'][number],
): PublicUserFriend {
  return {
    avatarUrl: secureImage(
      friend.avatar?.medium ??
        friend.avatar?.small ??
        friend.avatar?.large,
    ),
    nickname: friend.nickname || friend.username,
    username: friend.username,
  };
}

export function toPublicUserFriendPage(
  response: BangumiUserFriends,
  offset: number,
): PublicUserFriendPage {
  const nextOffset = offset + response.data.length;

  return {
    items: response.data.map(toPublicUserFriend),
    nextOffset:
      nextOffset < response.total ? nextOffset : undefined,
    total: response.total,
  };
}

export function toPublicTimelineItem(
  item: BangumiUserTimeline[number],
): PublicTimelineItem {
  const subjects = item.memo.subject ?? [];
  const firstSubject = subjects[0]?.subject;

  return {
    createdAt: item.createdAt,
    id: item.id,
    subjectId: subjects.length === 1 ? firstSubject?.id : undefined,
    text:
      subjects.length === 0
        ? '发布了一条公开动态'
        : subjects.length === 1
          ? `更新了《${firstSubject?.nameCN.trim() || firstSubject?.name}》的收藏状态`
          : `更新了 ${subjects.length} 个条目的收藏状态`,
  };
}

export function toPublicTimelinePage(
  timeline: BangumiUserTimeline,
  limit: number,
): PublicTimelinePage {
  const lastItem = timeline.at(-1);

  return {
    items: timeline.map(toPublicTimelineItem),
    nextCursor:
      timeline.length === limit && lastItem
        ? String(lastItem.id)
        : undefined,
  };
}
