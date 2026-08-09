import { type InfiniteData, useInfiniteQuery } from '@tanstack/react-query';

import { getGlobalIndexes } from '@/infrastructure/kaku/indexes-client';
import { queryKeys } from '@/lib/query-keys';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';
import type { GlobalIndexPage, IndexSort } from './model';

export function useGlobalIndexes(sort: IndexSort) {
  return useInfiniteQuery<
    GlobalIndexPage,
    Error,
    InfiniteData<GlobalIndexPage>,
    ReturnType<typeof queryKeys.globalIndexes>,
    number
  >({
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      getGlobalIndexes(sort, pageParam, signal),
    queryKey: queryKeys.globalIndexes(sort),
    retry: shouldRetryBangumiQuery,
    staleTime: 10 * 60 * 1000,
  });
}
