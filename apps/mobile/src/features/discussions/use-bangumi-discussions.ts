import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';

import { useSessionAwareQuery } from '@/features/auth/session-aware-query';
import { mapBangumiTopic } from '@/infrastructure/bangumi/discussions/adapter';
import { mapBangumiEpisodeComments } from '@/infrastructure/bangumi/discussions/adapter';
import { bangumiDiscussionsProvider } from '@/infrastructure/bangumi/discussions/provider';
import {
  getAuthenticatedEpisodeComments,
  getAuthenticatedSubjectTopic,
} from '@/infrastructure/kaku/discussions-client';
import { queryKeys } from '@/lib/query-keys';
import { PUBLIC_QUERY_META } from '@/lib/query-persistence';
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
    meta: PUBLIC_QUERY_META,
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
  const { queryFn, meta, suffix } = useSessionAwareQuery({
    public: (signal) =>
      bangumiDiscussionsProvider.getSubjectTopic(topicId, signal),
    authenticated: async (request, signal) => {
      const topic = await getAuthenticatedSubjectTopic(
        request,
        topicId,
        signal,
      );
      return topic ? mapBangumiTopic(topic) : null;
    },
  });

  return useQuery({
    enabled: Number.isInteger(topicId) && topicId > 0,
    queryFn,
    queryKey: [...queryKeys.subjectTopic(topicId), suffix],
    meta,
    retry: shouldRetryBangumiQuery,
    staleTime: 60 * 1000,
  });
}

export function useBangumiEpisodeComments(episodeId?: number) {
  const { queryFn, meta, suffix } = useSessionAwareQuery({
    public: (signal) =>
      bangumiDiscussionsProvider.getEpisodeComments(episodeId!, signal),
    authenticated: async (request, signal) =>
      mapBangumiEpisodeComments(
        await getAuthenticatedEpisodeComments(
          request,
          episodeId!,
          signal,
        ),
      ),
  });

  return useQuery({
    enabled: Number.isInteger(episodeId) && (episodeId ?? 0) > 0,
    queryFn,
    queryKey: [...queryKeys.episodeComments(episodeId), suffix],
    meta,
    retry: shouldRetryBangumiQuery,
    staleTime: 60 * 1000,
  });
}
