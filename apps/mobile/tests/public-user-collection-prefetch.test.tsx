import { QueryClient } from '@tanstack/react-query';

import {
  prefetchPublicUserCollections,
  publicUserCollectionsQueryOptions,
} from '@/features/users/use-public-user';
import { getPublicUserCollections } from '@/infrastructure/bangumi/users/provider';
import { PUBLIC_QUERY_META } from '@/lib/query-persistence';

jest.mock('@/infrastructure/bangumi/users/provider', () => ({ getPublicUserCollections: jest.fn() }));

let client: QueryClient;
beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
});
afterEach(() => client.clear());

test('prefetch failures resolve while preserving the error for a later visible query', async () => {
  const error = Object.assign(new Error('not found'), { status: 404 });
  jest.mocked(getPublicUserCollections).mockRejectedValueOnce(error);

  await expect(prefetchPublicUserCollections(client, 'tester', 2, 'doing')).resolves.toBeUndefined();

  const options = publicUserCollectionsQueryOptions('tester', 2, 'doing');
  expect(client.getQueryState(options.queryKey)?.error).toBe(error);
  expect(getPublicUserCollections).toHaveBeenCalledTimes(1);
});

test('prefetch and screen share the same persistent cache without a second request', async () => {
  const page = { items: [], total: 0, nextOffset: undefined };
  jest.mocked(getPublicUserCollections).mockResolvedValueOnce(page);

  await prefetchPublicUserCollections(client, ' tester ', 1, 'doing');
  const options = publicUserCollectionsQueryOptions('tester', 1, 'doing');
  const data = await client.fetchInfiniteQuery(options);

  expect(data).toEqual({ pages: [page], pageParams: [0] });
  expect(getPublicUserCollections).toHaveBeenCalledTimes(1);
  expect(getPublicUserCollections).toHaveBeenCalledWith('tester', 1, 0, 'doing', expect.any(AbortSignal));
  expect(client.getQueryCache().find({ queryKey: options.queryKey })?.meta).toEqual(PUBLIC_QUERY_META);
});

test('empty usernames do not create or fetch a prefetch query', () => {
  prefetchPublicUserCollections(client, ' ', 2, 'doing');

  expect(getPublicUserCollections).not.toHaveBeenCalled();
  expect(client.getQueryCache().getAll()).toHaveLength(0);
  expect(publicUserCollectionsQueryOptions(' ').enabled).toBe(false);
});
