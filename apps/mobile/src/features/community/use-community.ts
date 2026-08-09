import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';

import type { PublicGroupTopicPage } from './model';
import { useAuth } from '@/features/auth/auth-provider';
import { mapBangumiReplies } from '@/infrastructure/bangumi/discussions/adapter';
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
import { shouldRetryBangumiQuery } from '@/lib/query-retry';

export function usePublicCommunity() {
  return useQuery({
    queryFn: ({ signal }) => getPublicCommunity(signal),
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
    queryFn: ({ pageParam, signal }) =>
      getPublicCommunityTopics(pageParam, signal),
    queryKey: queryKeys.communityTopics(),
    retry: shouldRetryBangumiQuery,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePublicGroup(groupName: string) {
  return useQuery({
    enabled: groupName.trim().length > 0,
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
    queryFn: ({ pageParam, signal }) =>
      getPublicGroupTopics(groupName, pageParam, signal),
    queryKey: queryKeys.groupTopics(groupName),
    retry: shouldRetryBangumiQuery,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePublicGroupTopic(topicId: number) {
  const { request, session } = useAuth();

  return useQuery({
    enabled: Number.isInteger(topicId) && topicId > 0,
    queryFn: async ({ signal }) => {
      if (!session) {
        return getPublicGroupTopic(topicId, signal);
      }

      const topic = await getAuthenticatedGroupTopic(
        request,
        topicId,
        signal,
      );
      if (!topic) return null;

      return {
        ...toPublicGroupTopic(topic),
        groupName: topic.group.name,
        groupTitle: topic.group.title,
        replies: mapBangumiReplies(topic.replies),
      };
    },
    queryKey: [
      ...queryKeys.groupTopic(topicId),
      session?.user.id ?? 'public',
    ],
    retry: shouldRetryBangumiQuery,
    staleTime: 60 * 1000,
  });
}
