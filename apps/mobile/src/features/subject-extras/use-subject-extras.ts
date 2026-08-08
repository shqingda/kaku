import { useQuery } from '@tanstack/react-query';

import { bangumiSubjectExtrasProvider } from '@/infrastructure/bangumi/subject-extras/provider';
import { queryKeys } from '@/lib/query-keys';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';

export function useSubjectCharacters(subjectId: number) {
  return useQuery({
    enabled: Number.isInteger(subjectId) && subjectId > 0,
    queryFn: ({ signal }) =>
      bangumiSubjectExtrasProvider.getCharacters(subjectId, signal),
    queryKey: queryKeys.subjectCharacters(subjectId),
    retry: shouldRetryBangumiQuery,
    staleTime: 30 * 60 * 1000,
  });
}

export function useSubjectRelations(subjectId: number) {
  return useQuery({
    enabled: Number.isInteger(subjectId) && subjectId > 0,
    queryFn: ({ signal }) =>
      bangumiSubjectExtrasProvider.getRelations(subjectId, signal),
    queryKey: queryKeys.subjectRelations(subjectId),
    retry: shouldRetryBangumiQuery,
    staleTime: 30 * 60 * 1000,
  });
}
