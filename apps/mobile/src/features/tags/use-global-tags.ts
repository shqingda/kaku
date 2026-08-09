import { type InfiniteData, useInfiniteQuery } from '@tanstack/react-query';

import type { GlobalTagPage } from './model';
import { getGlobalTags } from '@/infrastructure/kaku/tags-client';
import { queryKeys } from '@/lib/query-keys';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';

export function useGlobalTags(subjectType: number) {
  return useInfiniteQuery<
    GlobalTagPage,
    Error,
    InfiniteData<GlobalTagPage>,
    ReturnType<typeof queryKeys.globalTags>,
    number
  >({
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      getGlobalTags(subjectType, pageParam, signal),
    queryKey: queryKeys.globalTags(subjectType),
    retry: shouldRetryBangumiQuery,
    staleTime: 10 * 60 * 1000,
  });
}
