import {
  type InfiniteData,
  infiniteQueryOptions,
  type QueryClient,
  queryOptions,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';
import { router } from 'expo-router';

import type { DiscoverSubjectPage } from './model';
import {
  getDiscoverCalendar,
  getRankedSubjects,
  searchDiscoverSubjects,
} from '@/infrastructure/bangumi/discover/provider';
import { getPublicRankedSubjects } from '@/infrastructure/kaku/rankings-client';
import { queryKeys } from '@/lib/query-keys';
import { PUBLIC_QUERY_META } from '@/lib/query-persistence';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';

async function fetchRankedSubjects(
  subjectType: number,
  offset: number,
  signal?: AbortSignal,
) {
  try {
    return await getPublicRankedSubjects(subjectType, offset, signal);
  } catch (error) {
    if (signal?.aborted) throw error;
    return getRankedSubjects(subjectType, offset, signal);
  }
}

export function calendarQueryOptions(enabled = true) {
  return queryOptions({
    enabled,
    meta: PUBLIC_QUERY_META,
    queryFn: ({ signal }) => getDiscoverCalendar(signal),
    queryKey: queryKeys.calendar(),
    retry: shouldRetryBangumiQuery,
    staleTime: 30 * 60 * 1000,
  });
}

export function rankedSubjectsQueryOptions(subjectType = 2) {
  return infiniteQueryOptions({
    getNextPageParam: (lastPage: DiscoverSubjectPage) => lastPage.nextOffset,
    initialPageParam: 0,
    meta: PUBLIC_QUERY_META,
    queryFn: ({ pageParam, signal }) =>
      fetchRankedSubjects(subjectType, pageParam, signal),
    queryKey: queryKeys.rankedSubjects(subjectType),
    retry: shouldRetryBangumiQuery,
    staleTime: 30 * 60 * 1000,
  });
}

export function useBangumiCalendar(enabled = true) {
  return useQuery(calendarQueryOptions(enabled));
}

export function useBangumiRankedSubjects(subjectType = 2) {
  return useInfiniteQuery(rankedSubjectsQueryOptions(subjectType));
}

export function useBangumiSearch(
  keyword: string,
  subjectType: number,
  enabled = true,
) {
  return useInfiniteQuery<
    DiscoverSubjectPage,
    Error,
    InfiniteData<DiscoverSubjectPage>,
    ReturnType<typeof queryKeys.subjectSearch>,
    number
  >({
    enabled: enabled && keyword.trim().length > 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      searchDiscoverSubjects(
        keyword.trim(),
        subjectType,
        pageParam,
        signal,
      ),
    queryKey: queryKeys.subjectSearch(keyword, subjectType),
    retry: shouldRetryBangumiQuery,
    staleTime: 10 * 60 * 1000,
  });
}

export function prefetchExplore(queryClient: QueryClient, subjectType = 2) {
  void queryClient.prefetchQuery(calendarQueryOptions());
  void queryClient.prefetchInfiniteQuery(
    rankedSubjectsQueryOptions(subjectType),
  );
  void router.prefetch('/explore');
}

export function prefetchRankings(queryClient: QueryClient, subjectType = 2) {
  void queryClient.prefetchInfiniteQuery(
    rankedSubjectsQueryOptions(subjectType),
  );
  void router.prefetch({
    pathname: '/rankings',
    params: { type: String(subjectType) },
  });
}

export function prefetchCalendar(queryClient: QueryClient) {
  void queryClient.prefetchQuery(calendarQueryOptions());
  void router.prefetch('/calendar');
}
