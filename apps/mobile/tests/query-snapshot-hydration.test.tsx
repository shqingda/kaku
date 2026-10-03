import { dehydrate, hydrate, InfiniteQueryObserver, QueryClient } from '@tanstack/react-query';

import { isPrivateQuery, PRIVATE_QUERY_META, PUBLIC_QUERY_META } from '@/lib/query-persistence';
import { deserializeQuerySnapshot, serializeQuerySnapshot } from '@/lib/query-snapshot';

function createClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
}

test('restores two pages and fetches the next page from the retained cursor', async () => {
  const source = createClient();
  const restored = createClient();
  const queryFn = jest.fn(async ({ pageParam }: { pageParam: number }) => ({ items: [pageParam], next: pageParam + 1 }));
  const options = {
    queryKey: ['snapshot-pagination'], queryFn, initialPageParam: 0,
    getNextPageParam: (page: { next: number }) => page.next,
    staleTime: Infinity, meta: PUBLIC_QUERY_META,
  };
  const firstObserver = new InfiniteQueryObserver(source, options);
  try {
    await firstObserver.refetch();
    await firstObserver.fetchNextPage();
    await firstObserver.fetchNextPage();
    await firstObserver.fetchNextPage();
    const snapshot = deserializeQuerySnapshot(serializeQuerySnapshot({
      timestamp: Date.now(), buster: 'public-catalog-v2', clientState: dehydrate(source),
    }));
    hydrate(restored, snapshot.clientState);
    expect(source.getQueryData(options.queryKey)).toMatchObject({ pageParams: [0, 1, 2, 3] });
    expect(restored.getQueryData(options.queryKey)).toMatchObject({ pageParams: [0, 1] });

    queryFn.mockClear();
    const restoredObserver = new InfiniteQueryObserver(restored, options);
    const next = await restoredObserver.fetchNextPage();
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(queryFn).toHaveBeenCalledWith(expect.objectContaining({ pageParam: 2 }));
    expect(next.data?.pages).toEqual([{ items: [0], next: 1 }, { items: [1], next: 2 }, { items: [2], next: 3 }]);
    expect(next.data?.pageParams).toEqual([0, 1, 2]);
    restoredObserver.destroy();
  } finally {
    firstObserver.destroy(); source.clear(); restored.clear();
  }
});

test('preserves private metadata so existing sign-out cleanup removes hydrated private queries', async () => {
  const source = createClient();
  const restored = createClient();
  try {
    await source.fetchQuery({ queryKey: ['private', 7], queryFn: async () => ({ progress: 3 }), meta: PRIVATE_QUERY_META });
    await source.fetchQuery({ queryKey: ['public'], queryFn: async () => ({ title: 'public' }), meta: PUBLIC_QUERY_META });
    const snapshot = deserializeQuerySnapshot(serializeQuerySnapshot({
      timestamp: Date.now(), buster: 'public-catalog-v2', clientState: dehydrate(source),
    }));
    hydrate(restored, snapshot.clientState);
    expect(restored.getQueryData(['private', 7])).toEqual({ progress: 3 });
    restored.removeQueries({ predicate: isPrivateQuery });
    expect(restored.getQueryData(['private', 7])).toBeUndefined();
    expect(restored.getQueryData(['public'])).toEqual({ title: 'public' });
    const afterSignOut = deserializeQuerySnapshot(serializeQuerySnapshot({
      timestamp: Date.now(), buster: snapshot.buster, clientState: dehydrate(restored),
    }));
    expect(afterSignOut.clientState.queries.map((query) => query.queryKey)).toEqual([['public']]);
  } finally {
    source.clear(); restored.clear();
  }
});
