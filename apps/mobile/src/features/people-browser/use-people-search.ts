import {
  type InfiniteData,
  useInfiniteQuery,
} from '@tanstack/react-query';

import { searchPeople } from '@/infrastructure/bangumi/people-browser/search-provider';
import { queryKeys } from '@/lib/query-keys';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';

import type { PeopleKind, PeopleSearchPage } from './model';

export function usePeopleSearch(
  kind: PeopleKind,
  keyword: string,
  enabled = true,
) {
  const normalizedKeyword = keyword.trim();

  return useInfiniteQuery<
    PeopleSearchPage,
    Error,
    InfiniteData<PeopleSearchPage>,
    ReturnType<typeof queryKeys.peopleSearch>,
    number
  >({
    enabled: enabled && normalizedKeyword.length > 0,
    // 与条目搜索一致：只回收不再被页面使用的临时结果。
    gcTime: 10 * 60 * 1000,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      searchPeople(kind, normalizedKeyword, pageParam, signal),
    queryKey: queryKeys.peopleSearch(kind, normalizedKeyword),
    retry: shouldRetryBangumiQuery,
    staleTime: 10 * 60 * 1000,
  });
}
