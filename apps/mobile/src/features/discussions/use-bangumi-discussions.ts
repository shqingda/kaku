import { useQuery } from '@tanstack/react-query';

import { bangumiDiscussionsProvider } from '@/infrastructure/bangumi/discussions/provider';
import { queryKeys } from '@/lib/query-keys';

export function useBangumiSubjectTopics(subjectId: number, limit = 20) {
  return useQuery({
    enabled: Number.isInteger(subjectId) && subjectId > 0,
    queryFn: () =>
      bangumiDiscussionsProvider.getSubjectTopics(subjectId, limit),
    queryKey: queryKeys.subjectTopics(subjectId, limit),
    retry: 2,
    staleTime: 60 * 1000,
  });
}

export function useBangumiSubjectTopic(topicId: number) {
  return useQuery({
    enabled: Number.isInteger(topicId) && topicId > 0,
    queryFn: () => bangumiDiscussionsProvider.getSubjectTopic(topicId),
    queryKey: queryKeys.subjectTopic(topicId),
    retry: 2,
    staleTime: 60 * 1000,
  });
}

export function useBangumiEpisodeComments(episodeId?: number) {
  return useQuery({
    enabled: Number.isInteger(episodeId) && (episodeId ?? 0) > 0,
    queryFn: () =>
      bangumiDiscussionsProvider.getEpisodeComments(episodeId!),
    queryKey: queryKeys.episodeComments(episodeId),
    retry: 2,
    staleTime: 60 * 1000,
  });
}
