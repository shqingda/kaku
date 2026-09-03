import { useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import {
  type InfiniteData,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';

import { useScrollToTopButton } from './use-scroll-to-top-button';

// 分页接口每一页的共同约定：items 数组 + 可选的 total。
// 页面形状不符合该约定（游标分页、无 items 字段等）的屏幕
// 直接使用 useInfiniteQuery 自己接线即可。
type PagedListPage<TItem> = {
  items?: readonly TItem[] | undefined;
  total?: number | undefined;
};

// 查询对象来自各 feature 层的 useInfiniteQuery（queryKey/queryFn/retry
// 等配置仍集中在 feature hook 里，屏幕不重复声明）。
// 错误类型放宽为 unknown：经 infiniteQueryOptions 推断的查询可能是 unknown。
type PagedQuery<TItem> = UseInfiniteQueryResult<
  InfiniteData<PagedListPage<TItem>>,
  unknown
>;

// 与 rankings.tsx 一致的平台调优：Android 用更小批次并开启视口裁剪，
// iOS 用更大的渲染窗口。
const LIST_TUNING = {
  initialNumToRender: Platform.OS === 'android' ? 6 : 12,
  maxToRenderPerBatch: Platform.OS === 'android' ? 6 : 12,
  updateCellsBatchingPeriod: Platform.OS === 'android' ? 60 : 40,
  removeClippedSubviews: Platform.OS === 'android',
  windowSize: Platform.OS === 'android' ? 5 : 7,
} as const;

// 把 useInfiniteQuery 的结果接上共享的分页列表脚手架：
// 扁平化 items、读取首页 total、onEndReached 守卫、
// PagedListFooter / AppRefreshControl / ScrollToTopButton 所需的状态，
// 以及 FlatList 的平台调优参数。
// 屏幕仍然自己声明 renderItem / keyExtractor / ListHeaderComponent 等；
// 需要覆盖调优参数时，在 {...listProps} 之后重新显式传入即可。
export function usePagedList<TItem>(query: PagedQuery<TItem>) {
  const listRef = useScrollToTopButton();
  const {
    fetchNextPage,
    hasNextPage,
    isFetchNextPageError,
    isFetchingNextPage,
    isPending,
    isRefetching,
    refetch,
  } = query;

  const pages = query.data?.pages;
  const items = useMemo(
    () => (pages ?? []).flatMap((page) => page.items ?? []),
    [pages],
  );
  const total = pages?.[0]?.total;

  // 自动加载更多的守卫：有下一页、不在加载中、且上次加载没有失败。
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchNextPageError, isFetchingNextPage]);

  // 页脚重试不判断守卫：失败后允许再次发起。
  const retryLoadMore = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const listProps = {
    ...LIST_TUNING,
    ref: listRef.ref,
    onEndReached: loadMore,
    onEndReachedThreshold: 0.45,
    onScroll: listRef.handleScroll,
    scrollEventThrottle: 80,
    showsVerticalScrollIndicator: false,
  };

  const footerProps = {
    hasNextPage: Boolean(hasNextPage),
    isError: isFetchNextPageError,
    isFetching: isFetchingNextPage,
    loadedCount: items.length,
    onRetry: retryLoadMore,
    total,
  };

  return {
    items,
    total,
    listProps,
    footerProps,
    // 极少数屏幕（如收藏页切换筛选）需要立即无动画回到列表顶部，
    // 交给它们直接操作底层 ref；常规置顶仍用 scrollToTop。
    listRef: listRef.ref,
    refresh,
    // 下拉刷新指示只反映整表刷新：等待首屏（isPending）和翻页都不算。
    refreshing: isRefetching && !isPending && !isFetchingNextPage,
    scrollToTop: listRef.scrollToTop,
    visible: listRef.visible,
  };
}
