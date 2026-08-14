import {
  type InfiniteData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';

import type { DiscoverSubjectPage } from './model';
import { bangumiDiscoverProvider } from '@/infrastructure/bangumi/discover/provider';
import { queryKeys } from '@/lib/query-keys';
import { PUBLIC_QUERY_META } from '@/lib/query-persistence';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';

export function useBangumiCalendar(enabled = true) {
  return useQuery({
    enabled,
    meta: PUBLIC_QUERY_META,
    queryFn: ({ signal }) => bangumiDiscoverProvider.getCalendar(signal),
    queryKey: queryKeys.calendar(),
    retry: shouldRetryBangumiQuery,
    staleTime: 30 * 60 * 1000,
  });
}

export function useBangumiRankedSubjects(subjectType = 2) {
  return useInfiniteQuery<
    DiscoverSubjectPage,
    Error,
    InfiniteData<DiscoverSubjectPage>,
    ReturnType<typeof queryKeys.rankedSubjects>,
    number
  >({
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
    meta: PUBLIC_QUERY_META,
    queryFn: ({ pageParam, signal }) =>
      bangumiDiscoverProvider.getRankedSubjects(
        subjectType,
        pageParam,
        signal,
      ),
    queryKey: queryKeys.rankedSubjects(subjectType),
    retry: shouldRetryBangumiQuery,
    staleTime: 30 * 60 * 1000,
  });
}

export function useBangumiSearch(keyword: string, subjectType: number) {
  return useInfiniteQuery<
    DiscoverSubjectPage,
    Error,
    InfiniteData<DiscoverSubjectPage>,
    ReturnType<typeof queryKeys.subjectSearch>,
    number
  >({
    enabled: keyword.trim().length > 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      bangumiDiscoverProvider.searchSubjects(
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
