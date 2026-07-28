import type {
  PublicUserBlog,
  PublicUserBlogPage,
  PublicUserCollection,
  PublicUserCollectionPage,
  PublicUserFriend,
  PublicUserFriendPage,
} from '../../../features/users/model.ts';
import type {
  BangumiUserBlogs,
  BangumiUserFriends,
} from '../api-next/schemas.ts';
import type { BangumiUserCollectionsResponse } from '../api-v0/schemas.ts';

const COLLECTION_STATUS: Record<number, string> = {
  1: '想看',
  2: '看过',
  3: '在看',
  4: '搁置',
  5: '抛弃',
};

function secureImage(url?: string) {
  return url?.replace(/^http:/, 'https:');
}

export function toPublicUserCollection(
  collection: BangumiUserCollectionsResponse['data'][number],
): PublicUserCollection {
  return {
    coverUrl: secureImage(
      collection.subject.images?.common ??
        collection.subject.images?.medium ??
        collection.subject.images?.small,
    ),
    id: collection.subject.id,
    progress: collection.ep_status,
    rate: collection.rate > 0 ? collection.rate : undefined,
    status: COLLECTION_STATUS[collection.type] ?? '收藏',
    title:
      collection.subject.name_cn.trim() || collection.subject.name,
    totalEpisodes: collection.subject.eps,
    updatedAt: collection.updated_at,
  };
}

export function toPublicUserCollectionPage(
  response: BangumiUserCollectionsResponse,
): PublicUserCollectionPage {
  const nextOffset = response.offset + response.data.length;

  return {
    items: response.data.map(toPublicUserCollection),
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
