import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';

import type {
  PublicUserBlogPage,
  PublicUserCollectionPage,
  PublicUserFriendPage,
  PublicUserEntityKind,
  PublicTimelinePage,
} from './model';
import type { CollectionStatus } from '@/features/watching/model';
import { bangumiUsersProvider } from '@/infrastructure/bangumi/users/provider';
import { queryKeys } from '@/lib/query-keys';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';

export function usePublicUser(username: string) {
  return useQuery({
    enabled: username.trim().length > 0,
    queryFn: ({ signal }) =>
      bangumiUsersProvider.getPublicUser(username, signal),
    queryKey: queryKeys.publicUser(username),
    retry: shouldRetryBangumiQuery,
    staleTime: 10 * 60 * 1000,
  });
}

export function usePublicUserCollections(
  username: string,
  subjectType = 2,
  collectionStatus?: CollectionStatus,
) {
  return useInfiniteQuery<
    PublicUserCollectionPage,
    Error,
    InfiniteData<PublicUserCollectionPage>,
    ReturnType<typeof queryKeys.publicUserCollections>,
    number
  >({
    enabled: username.trim().length > 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      bangumiUsersProvider.getPublicUserCollections(
        username.trim(),
        subjectType,
        pageParam,
        collectionStatus,
        signal,
      ),
    queryKey: queryKeys.publicUserCollections(
      username,
      subjectType,
      collectionStatus,
    ),
    retry: shouldRetryBangumiQuery,
    staleTime: 10 * 60 * 1000,
  });
}

export function usePublicUserBlogs(username: string) {
  return useInfiniteQuery<
    PublicUserBlogPage,
    Error,
    InfiniteData<PublicUserBlogPage>,
    ReturnType<typeof queryKeys.publicUserBlogs>,
    number
  >({
    enabled: username.trim().length > 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      bangumiUsersProvider.getPublicUserBlogs(
        username.trim(),
        pageParam,
        signal,
      ),
    queryKey: queryKeys.publicUserBlogs(username),
    retry: shouldRetryBangumiQuery,
    staleTime: 10 * 60 * 1000,
  });
}

export function usePublicUserFriends(username: string) {
  return useInfiniteQuery<
    PublicUserFriendPage,
    Error,
    InfiniteData<PublicUserFriendPage>,
    ReturnType<typeof queryKeys.publicUserFriends>,
    number
  >({
    enabled: username.trim().length > 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      bangumiUsersProvider.getPublicUserFriends(
        username.trim(),
        pageParam,
        signal,
      ),
    queryKey: queryKeys.publicUserFriends(username),
    retry: shouldRetryBangumiQuery,
    staleTime: 10 * 60 * 1000,
  });
}

export function usePublicUserEntities(
  username: string,
  kind: PublicUserEntityKind,
) {
  return useQuery({
    enabled: username.trim().length > 0,
    queryFn: ({ signal }) =>
      bangumiUsersProvider.getPublicUserEntities(
        username.trim(),
        kind,
        signal,
      ),
    queryKey: queryKeys.publicUserEntities(username, kind),
    retry: shouldRetryBangumiQuery,
    staleTime: 10 * 60 * 1000,
  });
}

export function usePublicUserTimeline(username: string) {
  return useInfiniteQuery<
    PublicTimelinePage,
    Error,
    InfiniteData<PublicTimelinePage>,
    ReturnType<typeof queryKeys.publicUserTimeline>,
    string | undefined
  >({
    enabled: username.trim().length > 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    queryFn: ({ pageParam, signal }) =>
      bangumiUsersProvider.getPublicUserTimeline(
        username.trim(),
        pageParam,
        signal,
      ),
    queryKey: queryKeys.publicUserTimeline(username),
    retry: shouldRetryBangumiQuery,
    staleTime: 10 * 60 * 1000,
  });
}
