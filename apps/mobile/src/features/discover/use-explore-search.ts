import { useMemo } from 'react';

import type { PublicPersonSummary } from '@/features/people-browser/model';
import { usePeopleSearch } from '@/features/people-browser/use-people-search';
import { readInfiniteItems, readInfinitePages } from '@/lib/query-data';

import {
  exploreSearchTotal,
  type ExploreSearchMode,
} from './explore-search';
import type { DiscoverSubject } from './model';
import { useBangumiSearch } from './use-discover';

export function useExploreSearch(
  keyword: string,
  subjectType: number,
  mode: ExploreSearchMode,
) {
  const subjectQuery = useBangumiSearch(
    keyword,
    subjectType,
    mode === 'subject',
  );
  const characterQuery = usePeopleSearch(
    'character',
    keyword,
    mode === 'character',
  );
  const personQuery = usePeopleSearch(
    'person',
    keyword,
    mode === 'person',
  );
  const query =
    mode === 'character'
      ? characterQuery
      : mode === 'person'
        ? personQuery
        : subjectQuery;
  const subjects = useMemo(
    () => readInfiniteItems<DiscoverSubject>(subjectQuery.data),
    [subjectQuery.data],
  );
  const people = useMemo(
    () =>
      readInfiniteItems<PublicPersonSummary>(
        mode === 'person' ? personQuery.data : characterQuery.data,
      ),
    [characterQuery.data, mode, personQuery.data],
  );
  const items = mode === 'subject' ? subjects : people;
  const total = exploreSearchTotal(
    mode,
    readInfinitePages<{ total?: number }>(query.data)[0]?.total,
    items.length,
  );

  return {
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isError: query.isError,
    isFetchNextPageError: query.isFetchNextPageError,
    isFetchingNextPage: query.isFetchingNextPage,
    isPending: query.isPending,
    isRefetching: query.isRefetching,
    items,
    refetch: query.refetch,
    total,
  };
}
