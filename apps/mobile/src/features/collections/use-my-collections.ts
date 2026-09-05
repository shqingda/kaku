import { useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/auth-provider';
import { getMyCollectionPage } from '@/infrastructure/kaku/collections-client';
import { queryKeys } from '@/lib/query-keys';
import {
  collectSearchPages,
  describeMyCollectionLoad,
  searchCollections,
  type CollectionSearchPreferences,
} from './collection-search';

export function useMyCollections(preferences: CollectionSearchPreferences) {
  const { session, request } = useAuth();
  const searching = Boolean(preferences.keyword.trim());
  const query = useInfiniteQuery({
    queryKey: searching
      ? queryKeys.myCollectionSearch(session?.user.id)
      : queryKeys.myCollectionBrowse(
          session?.user.id,
          preferences.subjectType,
          preferences.status,
        ),
    enabled: Boolean(session),
    meta: { private: true },
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      getMyCollectionPage(request, {
        offset: pageParam,
        signal,
        status: searching ? undefined : preferences.status,
        subjectType:
          searching || preferences.subjectType === 0
            ? undefined
            : preferences.subjectType,
      }),
    getNextPageParam: (page) => page.nextOffset,
    staleTime: 60_000,
    retry: false,
  });
  const {
    dataUpdatedAt,
    fetchNextPage,
    fetchStatus,
    hasNextPage,
    isError,
    isFetchNextPageError,
    isFetching,
    isPending,
  } = query;
  const collected = collectSearchPages(query.data?.pages ?? []);
  const items = searching
    ? searchCollections(collected.items, preferences)
    : collected.items;

  useEffect(() => {
    if (
      searching &&
      session &&
      hasNextPage &&
      !isFetching &&
      !isError &&
      !isFetchNextPageError &&
      fetchStatus !== 'paused'
    ) {
      void fetchNextPage();
    }
  }, [
    dataUpdatedAt,
    fetchNextPage,
    fetchStatus,
    hasNextPage,
    isError,
    isFetchNextPageError,
    isFetching,
    searching,
    session,
  ]);

  return {
    items,
    notice: describeMyCollectionLoad({
      complete: searching ? collected.complete : true,
      hasNextPage: Boolean(hasNextPage),
      isError,
      isFetching,
      isPending,
      loaded: collected.items.length,
      matched: items.length,
      paused: fetchStatus === 'paused',
      searching,
      total: collected.total,
    }),
    query,
    searching,
    total: collected.total,
  };
}
