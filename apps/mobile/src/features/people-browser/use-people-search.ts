import {
  type InfiniteData,
  useInfiniteQuery,
} from '@tanstack/react-query';

import { bangumiPeopleSearchProvider } from '@/infrastructure/bangumi/people-browser/search-provider';
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
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      bangumiPeopleSearchProvider.search(
        kind,
        normalizedKeyword,
        pageParam,
        signal,
      ),
    queryKey: queryKeys.peopleSearch(kind, normalizedKeyword),
    retry: shouldRetryBangumiQuery,
    staleTime: 10 * 60 * 1000,
  });
}
