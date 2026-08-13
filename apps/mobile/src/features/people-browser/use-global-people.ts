import { type InfiniteData, useInfiniteQuery } from '@tanstack/react-query';

import { getGlobalPeople } from '@/infrastructure/kaku/people-browser-client';
import { queryKeys } from '@/lib/query-keys';
import { PUBLIC_QUERY_META } from '@/lib/query-persistence';
import { shouldRetryBangumiQuery } from '@/lib/query-retry';
import type {
  GlobalPeoplePage,
  PeopleKind,
  PeopleSort,
} from './model';

export function useGlobalPeople(
  kind: PeopleKind,
  sort: PeopleSort,
  type?: number,
  gender?: number,
  enabled = true,
) {
  return useInfiniteQuery<
    GlobalPeoplePage,
    Error,
    InfiniteData<GlobalPeoplePage>,
    ReturnType<typeof queryKeys.globalPeople>,
    number
  >({
    enabled,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    meta: PUBLIC_QUERY_META,
    queryFn: ({ pageParam, signal }) =>
      getGlobalPeople(kind, sort, type, gender, pageParam, signal),
    queryKey: queryKeys.globalPeople(kind, sort, type, gender),
    retry: shouldRetryBangumiQuery,
    staleTime: 10 * 60 * 1000,
  });
}
