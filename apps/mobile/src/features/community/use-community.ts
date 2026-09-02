import {
  type InfiniteData,
  infiniteQueryOptions,
  type QueryClient,
  queryOptions,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';
import { router } from 'expo-router';

import type { PublicGroupTopicPage } from './model';
import { useSessionAwareQuery } from '@/features/auth/session-aware-query';
import { mapBangumiTopicContent } from '@/infrastructure/bangumi/discussions/adapter';
import {
  getPublicCommunity,
  getPublicCommunityTopics,
  getPublicGroup,
  getPublicGroupTopic,
  getPublicGroupTopics,
} from '@/infrastructure/bangumi/community/provider';
import { toPublicGroupTopic } from '@/infrastructure/bangumi/community/adapter';
import { getAuthenticatedGroupTopic } from '@/infrastructure/kaku/discussions-client';
import { queryKeys } from '@/lib/query-keys';
import { PUBLIC_QUERY_META } from '@/lib/query-persistence';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';

export function communityQueryOptions() {
  return queryOptions({
    meta: PUBLIC_QUERY_META,
    queryFn: ({ signal }) => getPublicCommunity(signal),
    queryKey: queryKeys.community(),
    retry: shouldRetryBangumiQuery,
    staleTime: 2 * 60 * 1000,
  });
}

export function communityTopicsQueryOptions() {
  return infiniteQueryOptions({
    getNextPageParam: (lastPage: PublicGroupTopicPage) => lastPage.nextOffset,
    initialPageParam: 0,
    meta: PUBLIC_QUERY_META,
    queryFn: ({ pageParam, signal }) =>
      getPublicCommunityTopics(pageParam, signal),
    queryKey: queryKeys.communityTopics(),
    retry: shouldRetryBangumiQuery,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePublicCommunity() {
  return useQuery(communityQueryOptions());
}

export function usePublicCommunityTopics() {
  return useInfiniteQuery(communityTopicsQueryOptions());
}

export function prefetchCommunity(queryClient: QueryClient) {
  void queryClient.prefetchQuery(communityQueryOptions());
  void queryClient.prefetchInfiniteQuery(communityTopicsQueryOptions());
  void router.prefetch('/community');
}

export function usePublicGroup(groupName: string) {
  return useQuery({
    enabled: groupName.trim().length > 0,
    meta: PUBLIC_QUERY_META,
    queryFn: ({ signal }) => getPublicGroup(groupName, signal),
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
    meta: PUBLIC_QUERY_META,
    queryFn: ({ pageParam, signal }) =>
      getPublicGroupTopics(groupName, pageParam, signal),
    queryKey: queryKeys.groupTopics(groupName),
    retry: shouldRetryBangumiQuery,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePublicGroupTopic(topicId: number) {
  const { queryFn, meta, suffix } = useSessionAwareQuery({
    public: (signal) => getPublicGroupTopic(topicId, signal),
    authenticated: async (request, signal) => {
      const topic = await getAuthenticatedGroupTopic(
        request,
        topicId,
        signal,
      );
      if (!topic) return null;

      return {
        ...toPublicGroupTopic(topic),
        ...mapBangumiTopicContent(topic),
        groupName: topic.group.name,
        groupTitle: topic.group.title,
      };
    },
  });

  return useQuery({
    enabled: Number.isInteger(topicId) && topicId > 0,
    queryFn,
    queryKey: [...queryKeys.groupTopic(topicId), suffix],
    meta,
    retry: shouldRetryBangumiQuery,
    staleTime: 60 * 1000,
  });
}
