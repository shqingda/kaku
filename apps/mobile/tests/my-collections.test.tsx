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
const browsing = { keyword: '', subjectType: 0, status: undefined as undefined };
const searching = { keyword: 'second', subjectType: 0, status: undefined as undefined };

test('browsing a filter does not download every remaining page', async () => {
  jest.mocked(getMyCollectionPage).mockResolvedValueOnce({ items: [first], total: 2, nextOffset: 1 });
  const { result } = await renderHook(() => useMyCollections({ ...browsing, subjectType: 2, status: 'doing' }), { wrapper });
  await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
  expect(result.current.searching).toBe(false);
  expect(result.current.items).toHaveLength(1);
  expect(getMyCollectionPage).toHaveBeenCalledTimes(1);
  expect(getMyCollectionPage).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ offset: 0, subjectType: 2, status: 'doing' }),
  );
});
test('searching loads every page instead of matching only the first', async () => {
  jest.mocked(getMyCollectionPage).mockResolvedValueOnce({ items: [first], total: 2, nextOffset: 1 }).mockResolvedValueOnce({ items: [second], total: 2 });
  const { result } = await renderHook(() => useMyCollections(searching), { wrapper });
  await waitFor(() => expect(result.current.notice.subtitle).toContain('找到 1 项'));
  expect(result.current.items.map(item => item.id)).toEqual([2]);
  expect(getMyCollectionPage).toHaveBeenNthCalledWith(
    2,
    expect.anything(),
    expect.objectContaining({ offset: 1, subjectType: undefined, status: undefined }),
  );
});
test('pagination failure keeps partial data and retries only the missing page', async () => {
  jest.mocked(getMyCollectionPage).mockResolvedValueOnce({ items: [first], total: 2, nextOffset: 1 }).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ items: [second], total: 2 });
  const { result } = await renderHook(() => useMyCollections(searching), { wrapper });
  await waitFor(() => expect(result.current.query.isFetchNextPageError).toBe(true));
  expect(result.current.notice.subtitle).toContain('不完整');
  expect(result.current.items).toHaveLength(0);
  await act(async () => { await result.current.query.fetchNextPage(); });
  await waitFor(() => expect(result.current.items.map(item => item.id)).toEqual([2]));
});
test('late response for previous account cannot replace new account results', async () => {
  let finish!: (page: Awaited<ReturnType<typeof getMyCollectionPage>>) => void;
  jest.mocked(getMyCollectionPage).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce({ items: [second], total: 1 });
  const hook = await renderHook(() => useMyCollections(browsing), { wrapper });
  await waitFor(() => expect(finish).toBeDefined());
  mockUserId = 2;
  await hook.rerender(undefined);
  await waitFor(() => expect(hook.result.current.items.map(item => item.id)).toEqual([2]));
  await act(() => { finish({ items: [first], total: 1 }); });
  expect(hook.result.current.items.map(item => item.id)).toEqual([2]);
});
