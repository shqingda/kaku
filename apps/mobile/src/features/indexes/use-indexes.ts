import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';

import type { PublicIndexPage } from './model';
import { bangumiIndexesProvider } from '@/infrastructure/bangumi/indexes/provider';
import { queryKeys } from '@/lib/query-keys';

export function useSubjectIndexes(subjectId: number) {
  return useInfiniteQuery<
    PublicIndexPage,
    Error,
    InfiniteData<PublicIndexPage>,
    ReturnType<typeof queryKeys.subjectIndexes>,
    number
  >({
    enabled: Number.isInteger(subjectId) && subjectId > 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      bangumiIndexesProvider.getSubjectIndexes(subjectId, pageParam),
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
