import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';

import { bangumiDiscussionsProvider } from '@/infrastructure/bangumi/discussions/provider';
import { queryKeys } from '@/lib/query-keys';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';

import type { DiscussionTopicPage } from './model';

export function useBangumiSubjectTopics(subjectId: number, limit = 20) {
  return useInfiniteQuery<
    DiscussionTopicPage,
    Error,
    InfiniteData<DiscussionTopicPage>,
    ReturnType<typeof queryKeys.subjectTopics>,
    number
  >({
    enabled: Number.isInteger(subjectId) && subjectId > 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      bangumiDiscussionsProvider.getSubjectTopics(
        subjectId,
        limit,
        pageParam,
      ),
    queryKey: queryKeys.subjectTopics(subjectId, limit),
    retry: shouldRetryBangumiQuery,
    staleTime: 60 * 1000,
  });
}

export function useBangumiSubjectTopic(topicId: number) {
  return useQuery({
    enabled: Number.isInteger(topicId) && topicId > 0,
    queryFn: () => bangumiDiscussionsProvider.getSubjectTopic(topicId),
    queryKey: queryKeys.subjectTopic(topicId),
    retry: shouldRetryBangumiQuery,
    staleTime: 60 * 1000,
  });
}

export function useBangumiEpisodeComments(episodeId?: number) {
  return useQuery({
    enabled: Number.isInteger(episodeId) && (episodeId ?? 0) > 0,
    queryFn: () =>
      bangumiDiscussionsProvider.getEpisodeComments(episodeId!),
    queryKey: queryKeys.episodeComments(episodeId),
    retry: shouldRetryBangumiQuery,
    staleTime: 60 * 1000,
  });
}
