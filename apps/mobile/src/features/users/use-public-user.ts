import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';

import type {
  PublicUserBlogPage,
  PublicUserCollectionPage,
  PublicUserFriendPage,
} from './model';
import { bangumiUsersProvider } from '@/infrastructure/bangumi/users/provider';
import { queryKeys } from '@/lib/query-keys';

export function usePublicUser(username: string) {
  return useQuery({
    enabled: username.trim().length > 0,
    queryFn: () => bangumiUsersProvider.getPublicUser(username),
    queryKey: queryKeys.publicUser(username),
    retry: 2,
    staleTime: 10 * 60 * 1000,
  });
}

export function usePublicUserCollections(username: string) {
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
    queryFn: ({ pageParam }) =>
      bangumiUsersProvider.getPublicUserCollections(
        username.trim(),
        pageParam,
      ),
    queryKey: queryKeys.publicUserCollections(username),
    retry: 2,
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
    queryFn: ({ pageParam }) =>
      bangumiUsersProvider.getPublicUserBlogs(
        username.trim(),
        pageParam,
      ),
    queryKey: queryKeys.publicUserBlogs(username),
    retry: 2,
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
    queryFn: ({ pageParam }) =>
      bangumiUsersProvider.getPublicUserFriends(
        username.trim(),
        pageParam,
      ),
    queryKey: queryKeys.publicUserFriends(username),
    retry: 2,
    staleTime: 10 * 60 * 1000,
  });
}
