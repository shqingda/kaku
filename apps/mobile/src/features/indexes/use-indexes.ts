import {
  type InfiniteData,
  infiniteQueryOptions,
  type QueryClient,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';
import { router } from 'expo-router';

import type {
  PublicIndexItemPage,
  PublicIndexPage,
} from './model';
import {
  getPublicIndex,
  getPublicIndexItems,
  getSubjectIndexes,
} from '@/infrastructure/bangumi/indexes/provider';
import { queryKeys } from '@/lib/query-keys';
import { PUBLIC_QUERY_META } from '@/lib/query-persistence';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';

export function subjectIndexesQueryOptions(subjectId: number) {
  return infiniteQueryOptions({
    enabled: Number.isInteger(subjectId) && subjectId > 0,
    getNextPageParam: (lastPage: PublicIndexPage) => lastPage.nextOffset,
    initialPageParam: 0,
    meta: PUBLIC_QUERY_META,
    queryFn: ({ pageParam, signal }) =>
      getSubjectIndexes(subjectId, pageParam, signal),
    queryKey: queryKeys.subjectIndexes(subjectId),
    retry: shouldRetryBangumiQuery,
    staleTime: 10 * 60 * 1000,
  });
}

export function useSubjectIndexes(subjectId: number) {
  return useInfiniteQuery(subjectIndexesQueryOptions(subjectId));
}

export function prefetchSubjectIndexes(
  queryClient: QueryClient,
  subjectId: number,
) {
  if (!Number.isInteger(subjectId) || subjectId <= 0) return;
  void queryClient.prefetchInfiniteQuery(subjectIndexesQueryOptions(subjectId));
  void router.prefetch({
    pathname: '/subject/[id]/indexes',
    params: { id: String(subjectId) },
  });
}

export function usePublicIndex(indexId: number) {
  return useQuery({
    enabled: Number.isInteger(indexId) && indexId > 0,
    meta: PUBLIC_QUERY_META,
    queryFn: ({ signal }) =>
      getPublicIndex(indexId, signal),
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
    meta: PUBLIC_QUERY_META,
    queryFn: ({ pageParam, signal }) =>
      getPublicIndexItems(indexId, pageParam, signal),
    queryKey: queryKeys.publicIndexItems(indexId),
    retry: shouldRetryBangumiQuery,
    staleTime: 10 * 60 * 1000,
  });
}
