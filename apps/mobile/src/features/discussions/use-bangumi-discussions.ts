import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import { mapBangumiTopic } from '@/infrastructure/bangumi/discussions/adapter';
import { bangumiDiscussionsProvider } from '@/infrastructure/bangumi/discussions/provider';
import { getAuthenticatedSubjectTopic } from '@/infrastructure/kaku/discussions-client';
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
    queryFn: ({ pageParam, signal }) =>
      bangumiDiscussionsProvider.getSubjectTopics(
        subjectId,
        limit,
        pageParam,
        signal,
      ),
    queryKey: queryKeys.subjectTopics(subjectId, limit),
    retry: shouldRetryBangumiQuery,
    staleTime: 60 * 1000,
  });
}

export function useBangumiSubjectTopic(topicId: number) {
  const { request, session } = useAuth();

  return useQuery({
    enabled: Number.isInteger(topicId) && topicId > 0,
    queryFn: async ({ signal }) => {
      if (!session) {
        return bangumiDiscussionsProvider.getSubjectTopic(topicId, signal);
      }

      const topic = await getAuthenticatedSubjectTopic(
        request,
        topicId,
        signal,
      );
      return topic ? mapBangumiTopic(topic) : null;
    },
    queryKey: [
      ...queryKeys.subjectTopic(topicId),
      session?.user.id ?? 'public',
    ],
    retry: shouldRetryBangumiQuery,
    staleTime: 60 * 1000,
  });
}

export function useBangumiEpisodeComments(episodeId?: number) {
  return useQuery({
    enabled: Number.isInteger(episodeId) && (episodeId ?? 0) > 0,
    queryFn: ({ signal }) =>
      bangumiDiscussionsProvider.getEpisodeComments(episodeId!, signal),
    queryKey: queryKeys.episodeComments(episodeId),
    retry: shouldRetryBangumiQuery,
    staleTime: 60 * 1000,
  });
}
