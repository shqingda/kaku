import { type InfiniteData, useInfiniteQuery } from '@tanstack/react-query';

import { getBrowseSubjects } from '@/infrastructure/kaku/browse-client';
import { queryKeys } from '@/lib/query-keys';
import { PUBLIC_QUERY_META } from '@/lib/query-persistence';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';
import type { BrowseSort, BrowseSubjectPage } from './model';

export function useBrowseSubjects({
  sort,
  subjectType,
  tag,
  year,
}: {
  sort: BrowseSort;
  subjectType: number;
  tag?: string;
  year?: number;
}) {
  return useInfiniteQuery<
    BrowseSubjectPage,
    Error,
    InfiniteData<BrowseSubjectPage>,
    ReturnType<typeof queryKeys.browseSubjects>,
    number
  >({
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    meta: PUBLIC_QUERY_META,
    queryFn: ({ pageParam, signal }) => getBrowseSubjects({
      page: pageParam,
      signal,
      sort,
      subjectType,
      tag,
      year,
    }),
    queryKey: queryKeys.browseSubjects(subjectType, sort, year, tag),
    retry: shouldRetryBangumiQuery,
    staleTime: 30 * 60 * 1000,
  });
}
