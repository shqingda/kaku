import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { ExploreSearchResults } from '@/features/discover/explore-search-results';
import { ThemeProvider } from '@/features/theme/theme-provider';
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/features/catalog/use-catalog-subject', () => ({ usePrefetchSubject: () => ({ prefetch: jest.fn(), cancel: jest.fn() }) }));
jest.mock('@/features/shared/app-refresh-control', () => ({ AppRefreshControl: () => null }));
jest.mock('expo-network', () => ({ useNetworkState: () => ({ isInternetReachable: true }) }));
const retry = jest.fn();
const props = { draft: 'test', keyword: 'test', hasNextPage: false, isError: false, isFetchNextPageError: false, isFetchingNextPage: false, isPending: false, isRefetching: false, items: [], total: 0, searchMode: 'subject' as const, selectedSearchTab: 2, onChangeDraft: jest.fn(), onChangeSearchTab: jest.fn(), onLoadMore: jest.fn(), onRefresh: jest.fn(), onRetry: retry, onSubmitSearch: jest.fn() };
afterEach(async () => { await cleanup(); retry.mockClear(); });
test('completed empty results no longer claim to be searching', async () => {
  await render(<ThemeProvider><ExploreSearchResults {...props} /></ThemeProvider>);
  expect(screen.getByText('没有找到结果')).toBeTruthy();
  expect(screen.queryByText(/查询中/)).toBeNull();
  expect(screen.getByText(/0 个/)).toBeTruthy();
});
test('refresh errors preserve existing results and provide retry', async () => {
  const items = [{ id: 1, title: '保留的条目', type: 2 }];
  await render(<ThemeProvider><ExploreSearchResults {...props} items={items} total={1} isError /></ThemeProvider>);
  expect(screen.getByText('保留的条目')).toBeTruthy();
  expect(screen.getByText('刷新失败')).toBeTruthy();
  await fireEvent.press(screen.getByText('重试'));
  expect(retry).toHaveBeenCalledTimes(1);
});
