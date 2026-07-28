import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';

import type { PublicGroupTopicPage } from './model';
import {
  getPublicCommunity,
  getPublicGroup,
  getPublicGroupTopic,
  getPublicGroupTopics,
} from '@/infrastructure/bangumi/community/provider';
import { queryKeys } from '@/lib/query-keys';

export function usePublicCommunity() {
  return useQuery({
    queryFn: getPublicCommunity,
    queryKey: queryKeys.community(),
    retry: 2,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePublicGroup(groupName: string) {
  return useQuery({
    enabled: groupName.trim().length > 0,
    queryFn: () => getPublicGroup(groupName),
    queryKey: queryKeys.group(groupName),
    retry: 2,
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
    retry: 2,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePublicGroupTopic(topicId: number) {
  return useQuery({
    enabled: Number.isInteger(topicId) && topicId > 0,
    queryFn: () => getPublicGroupTopic(topicId),
    queryKey: queryKeys.groupTopic(topicId),
    retry: 2,
    staleTime: 60 * 1000,
  });
}
