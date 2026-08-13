import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
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
    meta: session ? { private: true } : PUBLIC_QUERY_META,
    retry: shouldRetryBangumiQuery,
    staleTime: 60 * 1000,
  });
}

export function useBangumiEpisodeComments(episodeId?: number) {
  const { request, session } = useAuth();

  return useQuery({
    enabled: Number.isInteger(episodeId) && (episodeId ?? 0) > 0,
    queryFn: async ({ signal }) => {
      if (!session) {
        return bangumiDiscussionsProvider.getEpisodeComments(
          episodeId!,
          signal,
        );
      }

      return mapBangumiEpisodeComments(
        await getAuthenticatedEpisodeComments(
          request,
          episodeId!,
          signal,
        ),
      );
    },
    queryKey: [
      ...queryKeys.episodeComments(episodeId),
      session?.user.id ?? 'public',
    ],
    meta: session ? { private: true } : PUBLIC_QUERY_META,
    retry: shouldRetryBangumiQuery,
    staleTime: 60 * 1000,
  });
}
