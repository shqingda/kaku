import { renderHook } from '@testing-library/react-native';

import { usePagedList } from '@/features/shared/use-paged-list';

type TestItem = { id: number };

// usePagedList 只消费查询对象上的状态字段，测试用最小替身即可。
function fakeQuery(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      pageParams: [1, 2],
      pages: [
        { items: [{ id: 1 }, { id: 2 }], total: 24 },
        { items: [{ id: 3 }] },
      ],
    },
    fetchNextPage: jest.fn(),
    fetchStatus: 'idle',
    hasNextPage: true,
    isFetchNextPageError: false,
    isFetchingNextPage: false,
    isPending: false,
    isRefetching: false,
    refetch: jest.fn(),
    ...overrides,
  } as unknown as Parameters<typeof usePagedList<TestItem>>[0];
}

describe('usePagedList', () => {
  it('flattens page items and reads the first-page total', async () => {
    const { result } = await renderHook(() => usePagedList<TestItem>(fakeQuery()));

    expect(result.current.items).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(result.current.total).toBe(24);
  });

  it('falls back to an empty list and no total without data', async () => {
    const { result } = await renderHook(() =>
      usePagedList<TestItem>(fakeQuery({ data: undefined })),
    );

    expect(result.current.items).toEqual([]);
    expect(result.current.total).toBeUndefined();
  });

  it('loads the next page only when the guard allows it', async () => {
    const fetchNextPage = jest.fn();
    const { result } = await renderHook(() =>
      usePagedList<TestItem>(fakeQuery({ fetchNextPage })),
    );

    result.current.listProps.onEndReached();
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['the next page is fetching', { fetchStatus: 'fetching', isFetchingNextPage: true }],
    ['the whole list is refreshing', { fetchStatus: 'fetching', isRefetching: true }],
    ['the request is paused', { fetchStatus: 'paused' }],
    ['the last page request failed', { isFetchNextPageError: true }],
    ['there is no next page', { hasNextPage: false }],
  ])('does not load more when %s', async (_reason, overrides) => {
    const fetchNextPage = jest.fn();
    const { result } = await renderHook(() =>
      usePagedList<TestItem>(fakeQuery({ fetchNextPage, ...overrides })),
    );

    result.current.listProps.onEndReached();
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it.each([
    { fetchStatus: 'idle', isFetchNextPageError: true },
    { fetchStatus: 'paused', isFetchNextPageError: false },
  ])('exposes paused/error state and lets the user retry ($fetchStatus)', async (state) => {
    const fetchNextPage = jest.fn();
    const { result } = await renderHook(() =>
      usePagedList<TestItem>(
        fakeQuery({ fetchNextPage, ...state }),
      ),
    );

    expect(result.current.footerProps).toEqual({
      hasNextPage: true,
      isError: state.isFetchNextPageError,
      isFetching: false,
      isPaused: state.fetchStatus === 'paused',
      loadedCount: 3,
      onRetry: expect.any(Function),
      total: 24,
    });

    result.current.footerProps.onRetry();
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('shows the refresh indicator only for whole-list refetches', async () => {
    const refreshing = await renderHook(() =>
      usePagedList<TestItem>(fakeQuery({ isRefetching: true })),
    ).then(({ result }) => result.current.refreshing);
    expect(refreshing).toBe(true);

    const idle = await renderHook(() =>
      usePagedList<TestItem>(
        fakeQuery({ isFetchingNextPage: true, isRefetching: true }),
      ),
    ).then(({ result }) => result.current.refreshing);
    // 翻页属于无限查询的 isFetchingNextPage，不应点亮下拉刷新指示。
    expect(idle).toBe(false);
  });

  it('refresh delegates to the query refetch', async () => {
    const refetch = jest.fn();
    const { result } = await renderHook(() =>
      usePagedList<TestItem>(fakeQuery({ refetch })),
    );

    result.current.refresh();
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
