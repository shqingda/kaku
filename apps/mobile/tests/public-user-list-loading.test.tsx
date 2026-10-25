import { fireEvent, render, screen } from '@testing-library/react-native';

import PublicUserBlogsScreen from '@/app/user/blogs/[username]';
import PublicUserFriendsScreen from '@/app/user/friends/[username]';
import { ThemeProvider } from '@/features/theme/theme-provider';

const mockRetry = jest.fn();
let mockOffline = false;
let mockQuery = makeQuery();
function makeQuery() {
  return {
    data: undefined as { pages: { items: { username: string; nickname: string }[]; total: number }[] } | undefined,
    fetchStatus: 'fetching', isPending: true, isError: false, isRefetching: false,
    isFetchingNextPage: false, isFetchNextPageError: false, hasNextPage: false,
    refetch: mockRetry, fetchNextPage: jest.fn(),
  };
}

jest.mock('expo-router', () => ({ router: { push: jest.fn() }, Stack: { Screen: () => null }, useLocalSearchParams: () => ({ username: 'tester' }) }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/lib/use-connectivity', () => ({ useIsOffline: () => mockOffline }));
jest.mock('@/features/users/use-public-user', () => ({ usePublicUserBlogs: () => mockQuery, usePublicUserFriends: () => mockQuery }));
jest.mock('@/features/shared/skeleton', () => {
  const { View } = require('react-native');
  return { SkeletonBox: () => <View /> };
});

beforeEach(() => { mockRetry.mockClear(); mockOffline = false; mockQuery = makeQuery(); });

test('an empty user list uses skeletons only while online and exposes offline or failed retries', async () => {
  const page = () => <ThemeProvider><PublicUserBlogsScreen /></ThemeProvider>;
  const view = await render(page());
  expect(screen.getByLabelText('正在读取公开日志。')).toBeTruthy();
  expect(screen.queryByText('日志加载中')).toBeNull();

  mockQuery.fetchStatus = 'paused'; mockOffline = true;
  await view.rerender(page());
  expect(screen.queryByLabelText('正在读取公开日志。')).toBeNull();
  expect(screen.getByText('当前离线')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '重试' }));
  expect(mockRetry).toHaveBeenCalledTimes(1);

  mockQuery.fetchStatus = 'idle'; mockQuery.isPending = false; mockQuery.isError = true; mockOffline = false;
  await view.rerender(page());
  expect(screen.getByText('日志读取失败')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '重试' }));
  expect(mockRetry).toHaveBeenCalledTimes(2);
});

test('a refresh keeps cached friend cards and offers a retry when the refresh pauses offline', async () => {
  mockQuery.data = { pages: [{ items: [{ username: 'friend', nickname: '已加载好友' }], total: 1 }] };
  mockQuery.isPending = false; mockQuery.isRefetching = true;
  const page = () => <ThemeProvider><PublicUserFriendsScreen /></ThemeProvider>;
  const view = await render(page());
  expect(screen.getByLabelText('打开用户：已加载好友')).toBeTruthy();
  expect(screen.queryByLabelText('正在读取公开好友。')).toBeNull();

  mockQuery.fetchStatus = 'paused'; mockQuery.isRefetching = false; mockOffline = true;
  await view.rerender(page());
  expect(screen.getByLabelText('打开用户：已加载好友')).toBeTruthy();
  expect(screen.getByText('当前显示上次保存的内容')).toBeTruthy();
  expect(screen.queryByLabelText('正在读取公开好友。')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: '重新获取最新内容' }));
  expect(mockRetry).toHaveBeenCalledTimes(1);
});
