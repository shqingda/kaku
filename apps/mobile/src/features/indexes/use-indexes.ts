import { useQuery } from '@tanstack/react-query';

import { bangumiIndexesProvider } from '@/infrastructure/bangumi/indexes/provider';
import { queryKeys } from '@/lib/query-keys';

export function useSubjectIndexes(subjectId: number) {
  return useQuery({
    enabled: Number.isInteger(subjectId) && subjectId > 0,
    queryFn: () => bangumiIndexesProvider.getSubjectIndexes(subjectId),
    queryKey: queryKeys.subjectIndexes(subjectId),
    retry: 2,
    staleTime: 10 * 60 * 1000,
  });
}

export function usePublicIndex(indexId: number) {
  return useQuery({
    enabled: Number.isInteger(indexId) && indexId > 0,
    queryFn: () => bangumiIndexesProvider.getIndex(indexId),
    queryKey: queryKeys.publicIndex(indexId),
    retry: 2,
    staleTime: 10 * 60 * 1000,
  });
}
