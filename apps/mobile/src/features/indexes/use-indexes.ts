import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';

import type {
  PublicIndexItemPage,
  PublicIndexPage,
} from './model';
import { bangumiIndexesProvider } from '@/infrastructure/bangumi/indexes/provider';
import { queryKeys } from '@/lib/query-keys';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';

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
    retry: shouldRetryBangumiQuery,
    staleTime: 10 * 60 * 1000,
  });
}

export function usePublicIndex(indexId: number) {
  return useQuery({
    enabled: Number.isInteger(indexId) && indexId > 0,
    queryFn: () => bangumiIndexesProvider.getIndex(indexId),
    queryKey: queryKeys.publicIndex(indexId),
    retry: shouldRetryBangumiQuery,
    staleTime: 10 * 60 * 1000,
  });
}

export function usePublicIndexItems(indexId: number) {
  return useInfiniteQuery<
    PublicIndexItemPage,
    Error,
    InfiniteData<PublicIndexItemPage>,
    ReturnType<typeof queryKeys.publicIndexItems>,
    number
  >({
    enabled: Number.isInteger(indexId) && indexId > 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      bangumiIndexesProvider.getIndexItems(indexId, pageParam),
    queryKey: queryKeys.publicIndexItems(indexId),
    retry: shouldRetryBangumiQuery,
    staleTime: 10 * 60 * 1000,
  });
}
