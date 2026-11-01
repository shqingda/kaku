import { fireEvent, render } from '@testing-library/react-native';

import RankingsScreen from '@/app/rankings';
import type { DiscoverSubjectPage } from '@/features/discover/model';

const mockRetry = jest.fn();
let mockOffline = false;
let mockQuery = makeQuery();

function makeQuery() {
  return {
    data: undefined as { pages: DiscoverSubjectPage[] } | undefined,
    fetchStatus: 'fetching', isPending: true, isError: false, isRefetching: false,
    isFetchingNextPage: false, isFetchNextPageError: false, hasNextPage: false,
    refetch: mockRetry, fetchNextPage: jest.fn(),
  };
}

jest.mock('expo-router', () => ({
  router: { push: jest.fn() }, Stack: { Screen: () => null }, useLocalSearchParams: () => ({ type: '2' }),
}));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/lib/use-connectivity', () => ({ useIsOffline: () => mockOffline }));
jest.mock('@/features/discover/use-discover', () => ({ useBangumiRankedSubjects: () => mockQuery }));
jest.mock('@/features/catalog/use-catalog-subject', () => ({
  usePrefetchSubject: () => ({ prefetch: jest.fn(), cancel: jest.fn() }),
}));

beforeEach(() => { mockRetry.mockClear(); mockOffline = false; mockQuery = makeQuery(); });

test('initial rankings distinguish loading, pause, failure and successful empty results', async () => {
  const screen = await render(<RankingsScreen />);
  expect(screen.getByText('排行榜加载中')).toBeTruthy();

  mockQuery.fetchStatus = 'paused'; mockOffline = true;
  await screen.rerender(<RankingsScreen />);
  expect(screen.getByText('当前离线')).toBeTruthy();
  expect(screen.queryByText('排行榜加载中')).toBeNull();
  expect(screen.queryByText('暂无排行数据')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: '重试' }));
  expect(mockRetry).toHaveBeenCalledTimes(1);

  mockQuery.fetchStatus = 'fetching'; mockOffline = false;
  await screen.rerender(<RankingsScreen />);
  expect(screen.getByText('排行榜加载中')).toBeTruthy();
  expect(screen.queryByText('当前离线')).toBeNull();

  Object.assign(mockQuery, { fetchStatus: 'idle', isPending: false, isError: true });
  await screen.rerender(<RankingsScreen />);
  expect(screen.getByText('排行榜读取失败')).toBeTruthy();
  expect(screen.queryByText('暂无排行数据')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: '重试' }));
  expect(mockRetry).toHaveBeenCalledTimes(2);

  Object.assign(mockQuery, { isError: false, data: { pages: [{ items: [], total: 0 }] } });
  await screen.rerender(<RankingsScreen />);
  expect(screen.getByText('暂无排行数据')).toBeTruthy();
  expect(screen.queryByText('排行榜读取失败')).toBeNull();
});

test('paused and failed refreshes retain cached rankings and offer retry', async () => {
  Object.assign(mockQuery, {
    data: { pages: [{ items: [{ id: 1, title: '已加载条目', type: 2 }], total: 1 }] },
    isPending: false, isRefetching: true,
  });
  const screen = await render(<RankingsScreen />);
  expect(screen.getByLabelText('排行榜第 1 名：已加载条目')).toBeTruthy();

  mockQuery.fetchStatus = 'paused'; mockQuery.isRefetching = false; mockOffline = true;
  await screen.rerender(<RankingsScreen />);
  expect(screen.getByLabelText('排行榜第 1 名：已加载条目')).toBeTruthy();
  expect(screen.getByText('当前显示上次保存的内容')).toBeTruthy();
  expect(screen.queryByText('排行榜加载中')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: '重新获取最新内容' }));
  expect(mockRetry).toHaveBeenCalledTimes(1);

  mockQuery.fetchStatus = 'idle'; mockQuery.isError = true; mockOffline = false;
  await screen.rerender(<RankingsScreen />);
  expect(screen.getByLabelText('排行榜第 1 名：已加载条目')).toBeTruthy();
  expect(screen.getByText('当前显示上次保存的内容')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '重新获取最新内容' }));
  expect(mockRetry).toHaveBeenCalledTimes(2);
});
