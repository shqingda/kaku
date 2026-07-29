import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';

import type { PublicGroupTopicPage } from './model';
import {
  getPublicCommunity,
  getPublicCommunityTopics,
  getPublicGroup,
  getPublicGroupTopic,
  getPublicGroupTopics,
} from '@/infrastructure/bangumi/community/provider';
import { queryKeys } from '@/lib/query-keys';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';

export function usePublicCommunity() {
  return useQuery({
    queryFn: getPublicCommunity,
    queryKey: queryKeys.community(),
    retry: shouldRetryBangumiQuery,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePublicCommunityTopics() {
  return useInfiniteQuery<
    PublicGroupTopicPage,
    Error,
    InfiniteData<PublicGroupTopicPage>,
    ReturnType<typeof queryKeys.communityTopics>,
    number
  >({
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getPublicCommunityTopics(pageParam),
    queryKey: queryKeys.communityTopics(),
    retry: shouldRetryBangumiQuery,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePublicGroup(groupName: string) {
  return useQuery({
    enabled: groupName.trim().length > 0,
    queryFn: () => getPublicGroup(groupName),
    queryKey: queryKeys.group(groupName),
    retry: shouldRetryBangumiQuery,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePublicGroupTopics(groupName: string) {
  return useInfiniteQuery<
    PublicGroupTopicPage,
    Error,
    InfiniteData<PublicGroupTopicPage>,
    ReturnType<typeof queryKeys.groupTopics>,
    number
  >({
    enabled: groupName.trim().length > 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getPublicGroupTopics(groupName, pageParam),
    queryKey: queryKeys.groupTopics(groupName),
    retry: shouldRetryBangumiQuery,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePublicGroupTopic(topicId: number) {
  return useQuery({
    enabled: Number.isInteger(topicId) && topicId > 0,
    queryFn: () => getPublicGroupTopic(topicId),
    queryKey: queryKeys.groupTopic(topicId),
    retry: shouldRetryBangumiQuery,
    staleTime: 60 * 1000,
  });
}
