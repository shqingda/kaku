import { useQuery } from '@tanstack/react-query';

import { bangumiSubjectExtrasProvider } from '@/infrastructure/bangumi/subject-extras/provider';
import { queryKeys } from '@/lib/query-keys';

export function useSubjectCharacters(subjectId: number) {
  return useQuery({
    enabled: Number.isInteger(subjectId) && subjectId > 0,
    queryFn: () => bangumiSubjectExtrasProvider.getCharacters(subjectId),
    queryKey: queryKeys.subjectCharacters(subjectId),
    retry: 2,
    staleTime: 30 * 60 * 1000,
  });
}

export function useSubjectRelations(subjectId: number) {
  return useQuery({
    enabled: Number.isInteger(subjectId) && subjectId > 0,
    queryFn: () => bangumiSubjectExtrasProvider.getRelations(subjectId),
    queryKey: queryKeys.subjectRelations(subjectId),
    retry: 2,
    staleTime: 30 * 60 * 1000,
  });
}
