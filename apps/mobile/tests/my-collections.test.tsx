import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useMyCollections } from '@/features/collections/use-my-collections';
import { getMyCollectionPage } from '@/infrastructure/kaku/collections-client';
let mockUserId = 1;
jest.mock('@/features/auth/auth-provider', () => ({ useAuth: () => ({ session: { user: { id: mockUserId } }, request: jest.fn() }) }));
jest.mock('@/infrastructure/kaku/collections-client', () => ({ getMyCollectionPage: jest.fn() }));
const first = { id: 1, title: 'first', subjectType: 2, collectionStatus: 'doing' as const, progress: 0, volumeProgress: 0, totalEpisodes: 1, updatedAt: '2026-09-01' };
const second = { ...first, id: 2, title: 'second' };
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
let client: QueryClient;
beforeEach(() => { mockUserId = 1; jest.resetAllMocks(); client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } }); });
afterEach(() => client.clear());
test('automatically loads every page instead of searching only the first', async () => {
  jest.mocked(getMyCollectionPage).mockResolvedValueOnce({ items: [first], total: 2, nextOffset: 1 }).mockResolvedValueOnce({ items: [second], total: 2 });
  const { result } = await renderHook(() => useMyCollections(), { wrapper });
  await waitFor(() => expect(result.current.complete).toBe(true));
  expect(result.current.items.map(item => item.id)).toEqual([1, 2]);
  expect(getMyCollectionPage).toHaveBeenNthCalledWith(2, expect.anything(), 1, expect.anything());
});
test('pagination failure keeps partial data and retries only the missing page', async () => {
  jest.mocked(getMyCollectionPage).mockResolvedValueOnce({ items: [first], total: 2, nextOffset: 1 }).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ items: [second], total: 2 });
  const { result } = await renderHook(() => useMyCollections(), { wrapper });
  await waitFor(() => expect(result.current.query.isFetchNextPageError).toBe(true));
  expect(result.current.complete).toBe(false);
  expect(result.current.items).toHaveLength(1);
  await act(async () => { await result.current.query.fetchNextPage(); });
  await waitFor(() => expect(result.current.complete).toBe(true));
});
test('late response for previous account cannot replace new account results', async () => {
  let finish!: (page: Awaited<ReturnType<typeof getMyCollectionPage>>) => void;
  jest.mocked(getMyCollectionPage).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce({ items: [second], total: 1 });
  const hook = await renderHook(() => useMyCollections(), { wrapper });
  await waitFor(() => expect(finish).toBeDefined());
  mockUserId = 2;
  await hook.rerender(undefined);
  await waitFor(() => expect(hook.result.current.complete).toBe(true));
  await act(() => { finish({ items: [first], total: 1 }); });
  expect(hook.result.current.items.map(item => item.id)).toEqual([2]);
});
