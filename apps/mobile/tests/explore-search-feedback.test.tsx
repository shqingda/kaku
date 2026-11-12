import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { type FetchStatus, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from 'expo-router';

import ExploreScreen from '@/app/explore';
import type { CalendarDay, DiscoverSubjectPage } from '@/features/discover/model';
import { setSearchDraft } from '@/features/search/search-draft';

function queryState() {
  return {
    fetchStatus: 'fetching' as FetchStatus,
    isPending: true, isError: false, isRefetching: false,
    refetch: jest.fn(),
  };
}

function searchQuery() {
  return {
    ...queryState(),
    data: undefined as { pages: DiscoverSubjectPage[] } | undefined,
    hasNextPage: false, isFetchingNextPage: false, isFetchNextPageError: false,
    fetchNextPage: jest.fn(),
  };
}

let mockParams: { q?: string };
let mockSearch = searchQuery();
let mockCharacterSearch = searchQuery();
let mockPersonSearch = searchQuery();
let mockCalendar = { ...queryState(), data: undefined as CalendarDay[] | undefined };
let mockRanking = searchQuery();
let mockOffline = false;
const mockHistory = {
  items: [], localStatus: 'ready', isClearing: false,
  addSearch: jest.fn(), refreshFromCloud: jest.fn(), syncIfStale: jest.fn(),
};
let client: QueryClient;

jest.mock('@/features/auth/login-device', () => ({ getLoginDevice: async () => ({ deviceName: 'iPhone', deviceKey: 'a'.repeat(64) }) }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), prefetch: jest.fn() }, Stack: { Screen: () => null },
  useLocalSearchParams: () => mockParams, useFocusEffect: () => {},
}));
jest.mock('expo-router/react-navigation', () => ({ useHeaderHeight: () => 0 }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/shared/use-restore-scroll-on-focus', () => ({ useRestoreScrollOnFocus: () => ({ handleScroll: jest.fn() }) }));
jest.mock('@/features/history/use-clear-history-action', () => ({ useClearHistoryAction: () => jest.fn() }));
jest.mock('@/features/search/search-history-provider', () => ({ useSearchHistory: () => mockHistory }));
jest.mock('@/features/history/recent-subjects-provider', () => ({ useRecentSubjects: () => mockHistory }));
jest.mock('@/features/catalog/use-catalog-subject', () => ({ usePrefetchSubject: () => ({ prefetch: jest.fn(), cancel: jest.fn() }) }));
jest.mock('@/lib/use-connectivity', () => ({ useIsOffline: () => mockOffline }));
jest.mock('@/features/discover/use-discover', () => ({
  useBangumiSearch: () => mockSearch,
  useBangumiCalendar: () => mockCalendar,
  useBangumiRankedSubjects: () => mockRanking,
  prefetchRankings: jest.fn(),
}));
jest.mock('@/features/people-browser/use-people-search', () => ({
  usePeopleSearch: (kind: string) => kind === 'person' ? mockPersonSearch : mockCharacterSearch,
}));

beforeEach(() => {
  jest.clearAllMocks();
  setSearchDraft('');
  mockParams = { q: 'test' };
  mockSearch = searchQuery();
  mockCharacterSearch = searchQuery();
  mockPersonSearch = searchQuery();
  mockCalendar = { ...queryState(), data: undefined };
  mockRanking = searchQuery();
  mockOffline = false;
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
});

afterEach(async () => { await cleanup(); client.clear(); });

function page() {
  return <QueryClientProvider client={client}><ExploreScreen /></QueryClientProvider>;
}

test('search moves through loading, paused, retrying, failed and successful empty states', async () => {
  const view = await render(page());
  expect(screen.getByText('正在搜索')).toBeTruthy();

  mockSearch.fetchStatus = 'paused';
  await view.rerender(page());
  expect(screen.getByText('恢复连接后可继续搜索。')).toBeTruthy();
  expect(screen.getByText(/等待联网/)).toBeTruthy();
  expect(screen.queryByText('正在搜索')).toBeNull();
  expect(screen.queryByText('没有找到结果')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: '重试' }));
  expect(mockSearch.refetch).toHaveBeenCalledTimes(1);
  expect(mockSearch.fetchNextPage).not.toHaveBeenCalled();

  mockSearch.fetchStatus = 'fetching';
  await view.rerender(page());
  expect(screen.getByText('正在搜索')).toBeTruthy();
  expect(screen.queryByText('当前离线')).toBeNull();

  Object.assign(mockSearch, { fetchStatus: 'idle', isPending: false, isError: true });
  await view.rerender(page());
  expect(screen.getByText('搜索失败')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '重试' }));
  expect(mockSearch.refetch).toHaveBeenCalledTimes(2);

  Object.assign(mockSearch, { isError: false, data: { pages: [{ items: [], total: 0 }] } });
  await view.rerender(page());
  expect(screen.getByText('没有找到结果')).toBeTruthy();
  expect(screen.queryByText(/查询中|查询失败/)).toBeNull();
  expect(screen.getByText(/0 个条目/)).toBeTruthy();
});

test.each(['character', 'person'] as const)('search pause and retry follow the selected %s query', async kind => {
  Object.assign(mockSearch, { fetchStatus: 'idle', isPending: false, data: { pages: [{ items: [], total: 0 }] } });
  const active = kind === 'character' ? mockCharacterSearch : mockPersonSearch;
  active.fetchStatus = 'paused';
  await render(page());
  await fireEvent.press(screen.getByRole('tab', { name: kind === 'character' ? '角色分类' : '人物分类' }));

  expect(screen.getByText('恢复连接后可继续搜索。')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '重试' }));
  expect(active.refetch).toHaveBeenCalledTimes(1);
  expect(mockSearch.refetch).not.toHaveBeenCalled();
});

test('paused and failed search refreshes keep results and retry the full search', async () => {
  Object.assign(mockSearch, {
    data: { pages: [{ items: [{ id: 1, title: '保留的条目', type: 2 }], total: 1 }] },
    isPending: false, isRefetching: true,
  });
  const view = await render(page());
  mockSearch.fetchStatus = 'paused'; mockSearch.isRefetching = false;
  await view.rerender(page());
  expect(screen.getByText('保留的条目')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '重新获取最新内容' }));
  expect(mockSearch.refetch).toHaveBeenCalledTimes(1);

  mockSearch.fetchStatus = 'idle'; mockSearch.isError = true;
  await view.rerender(page());
  expect(screen.getByText('保留的条目')).toBeTruthy();
  expect(screen.getByText('刷新失败')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '重试' }));
  expect(mockSearch.refetch).toHaveBeenCalledTimes(2);
  expect(mockSearch.fetchNextPage).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('保留的条目'));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/subject/[id]', params: { id: '1' } });
});

test('search pagination waits during refresh, pause or page failure and retries only the next page', async () => {
  Object.assign(mockSearch, {
    data: { pages: [{ items: [{ id: 1, title: '保留的条目', type: 2 }], total: 2 }] },
    hasNextPage: true, isPending: false, isRefetching: true,
  });
  const view = await render(page());
  const reachEnd = () => fireEvent(screen.getByText('保留的条目'), 'endReached');
  await reachEnd();
  expect(mockSearch.fetchNextPage).not.toHaveBeenCalled();

  mockSearch.fetchStatus = 'paused'; mockSearch.isRefetching = false;
  await view.rerender(page());
  expect(screen.getByText('后续结果等待联网')).toBeTruthy();
  expect(screen.queryByText('正在加载更多结果')).toBeNull();
  await reachEnd();
  expect(mockSearch.fetchNextPage).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: '重试' }));
  expect(mockSearch.fetchNextPage).toHaveBeenCalledTimes(1);
  expect(mockSearch.refetch).not.toHaveBeenCalled();

  mockSearch.fetchStatus = 'fetching'; mockSearch.isFetchingNextPage = true;
  await view.rerender(page());
  expect(screen.getByText('正在加载更多结果')).toBeTruthy();
  expect(screen.queryByText('后续结果等待联网')).toBeNull();
  await reachEnd();
  expect(mockSearch.fetchNextPage).toHaveBeenCalledTimes(1);

  Object.assign(mockSearch, { fetchStatus: 'idle', isFetchingNextPage: false, isError: true, isFetchNextPageError: true });
  await view.rerender(page());
  expect(screen.getByText('后续结果加载失败')).toBeTruthy();
  expect(screen.queryByText('刷新失败')).toBeNull();
  await reachEnd();
  expect(mockSearch.fetchNextPage).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: '重试' }));
  expect(mockSearch.fetchNextPage).toHaveBeenCalledTimes(2);

  Object.assign(mockSearch, { isError: false, isFetchNextPageError: false });
  mockOffline = true;
  await view.rerender(page());
  await reachEnd();
  expect(mockSearch.fetchNextPage).toHaveBeenCalledTimes(2);

  mockOffline = false;
  await view.rerender(page());
  await reachEnd();
  expect(mockSearch.fetchNextPage).toHaveBeenCalledTimes(3);
  expect(mockSearch.refetch).not.toHaveBeenCalled();
});

test('overview retries paused calendar and rankings separately, then shows cached and empty states', async () => {
  mockParams = {};
  mockCalendar.fetchStatus = 'paused'; mockRanking.fetchStatus = 'paused';
  const view = await render(page());
  expect(screen.queryByText('正在读取放送表')).toBeNull();
  expect(screen.queryByText('正在读取排行榜')).toBeNull();
  const pausedRetries = screen.getAllByRole('button', { name: '重试' });
  await fireEvent.press(pausedRetries[0]);
  expect(mockCalendar.refetch).toHaveBeenCalledTimes(1);
  expect(mockRanking.refetch).not.toHaveBeenCalled();
  await fireEvent.press(pausedRetries[1]);
  expect(mockRanking.refetch).toHaveBeenCalledTimes(1);

  mockCalendar.fetchStatus = 'fetching'; mockRanking.fetchStatus = 'fetching';
  await view.rerender(page());
  expect(screen.getByText('正在读取放送表')).toBeTruthy();
  expect(screen.getByText('正在读取排行榜')).toBeTruthy();

  Object.assign(mockCalendar, { fetchStatus: 'idle', isPending: false, isError: true });
  Object.assign(mockRanking, { fetchStatus: 'idle', isPending: false, isError: true });
  await view.rerender(page());
  expect(screen.getByText('放送表读取失败')).toBeTruthy();
  expect(screen.getByText('排行榜读取失败')).toBeTruthy();

  Object.assign(mockCalendar, { isError: false, data: [] });
  Object.assign(mockRanking, { isError: false, data: { pages: [{ items: [] }] } });
  await view.rerender(page());
  expect(screen.getByText('今天暂无条目')).toBeTruthy();
  expect(screen.getByText('暂无排行数据')).toBeTruthy();

  mockCalendar.data = [{ id: 1, label: '星期一', subjects: [{ id: 11, title: '已保存放送', type: 2 }] }];
  mockRanking.data = { pages: [{ items: [{ id: 22, title: '已保存排行', type: 2 }] }] };
  for (const state of [{ fetchStatus: 'paused' as const }, { fetchStatus: 'idle' as const, isError: true }]) {
    Object.assign(mockCalendar, state); Object.assign(mockRanking, state);
    await view.rerender(page());
    expect(screen.getByText('已保存放送')).toBeTruthy();
    expect(screen.getByText('已保存排行')).toBeTruthy();
    const retries = screen.getAllByRole('button', { name: '重新获取最新内容' });
    await fireEvent.press(retries[0]); await fireEvent.press(retries[1]);
  }
  expect(mockCalendar.refetch).toHaveBeenCalledTimes(3);
  expect(mockRanking.refetch).toHaveBeenCalledTimes(3);

  mockCalendar.isError = false; mockRanking.isError = false;
  await view.rerender(page());
  expect(screen.queryByText('当前显示上次保存的内容')).toBeNull();
  expect(screen.getByText('已保存放送')).toBeTruthy();
  expect(screen.getByText('已保存排行')).toBeTruthy();
});
