import { useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/auth-provider';
import { getMyCollectionPage } from '@/infrastructure/kaku/collections-client';
import { queryKeys } from '@/lib/query-keys';
import { collectSearchPages } from './collection-search';

export function useMyCollections() {
  const { session, request } = useAuth();
  const query = useInfiniteQuery({
    queryKey: queryKeys.myCollections(session?.user.id),
    enabled: Boolean(session),
    meta: { private: true },
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      getMyCollectionPage(request, pageParam, signal),
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
  } = query;

  useEffect(() => {
    if (
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
    session,
  ]);

  return { query, ...collectSearchPages(query.data?.pages ?? []) };
}
