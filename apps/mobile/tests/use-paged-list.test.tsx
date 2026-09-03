import { renderHook } from '@testing-library/react-native';

import { usePagedList } from '@/features/shared/use-paged-list';

type TestItem = { id: number };

type TestPage = {
  items: TestItem[];
  total?: number;
};

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

  it('skips loading more while the next page is already fetching', async () => {
    const fetchNextPage = jest.fn();
    const { result } = await renderHook(() =>
      usePagedList<TestItem>(
        fakeQuery({ fetchNextPage, isFetchingNextPage: true }),
      ),
    );

    result.current.listProps.onEndReached();
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('skips loading more after a failed page fetch', async () => {
    const fetchNextPage = jest.fn();
    const { result } = await renderHook(() =>
      usePagedList<TestItem>(
        fakeQuery({ fetchNextPage, isFetchNextPageError: true }),
      ),
    );

    result.current.listProps.onEndReached();
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('skips loading more when there is no next page', async () => {
    const fetchNextPage = jest.fn();
    const { result } = await renderHook(() =>
      usePagedList<TestItem>(fakeQuery({ fetchNextPage, hasNextPage: false })),
    );

    result.current.listProps.onEndReached();
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('exposes footer props and lets the retry bypass the guard', async () => {
    const fetchNextPage = jest.fn();
    const { result } = await renderHook(() =>
      usePagedList<TestItem>(
        fakeQuery({ fetchNextPage, isFetchNextPageError: true }),
      ),
    );

    expect(result.current.footerProps).toEqual({
      hasNextPage: true,
      isError: true,
      isFetching: false,
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

  it('wires the shared scroll and tuning props onto the list', async () => {
    const { result } = await renderHook(() => usePagedList<TestItem>(fakeQuery()));

    const listProps = result.current.listProps;
    expect(listProps.onEndReachedThreshold).toBe(0.45);
    expect(listProps.scrollEventThrottle).toBe(80);
    expect(listProps.showsVerticalScrollIndicator).toBe(false);
    expect([5, 7]).toContain(listProps.windowSize);
    expect(typeof listProps.ref).toBe('object');
    expect(typeof listProps.onScroll).toBe('function');
    expect(typeof listProps.removeClippedSubviews).toBe('boolean');
    expect(typeof result.current.scrollToTop).toBe('function');
    expect(result.current.visible).toBe(false);
  });
});
