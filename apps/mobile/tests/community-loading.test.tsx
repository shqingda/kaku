import { fireEvent, render } from '@testing-library/react-native';

import CommunityScreen from '@/app/community';
import GroupScreen from '@/app/group/[name]';
import type { PublicCommunity, PublicGroupDetail, PublicGroupTopicPage } from '@/features/community/model';

function makeQuery<TData>() {
  return {
    data: undefined as TData | undefined,
    fetchStatus: 'fetching', isPending: true, isPaused: false, isError: false, isRefetching: false,
    isFetchingNextPage: false, isFetchNextPageError: false, hasNextPage: false,
    refetch: jest.fn(), fetchNextPage: jest.fn(),
  };
}

let mockCommunity = makeQuery<PublicCommunity>();
let mockGroup = makeQuery<PublicGroupDetail>();
let mockTopics = makeQuery<{ pages: PublicGroupTopicPage[] }>();

jest.mock('expo-router', () => ({
  router: { push: jest.fn() }, Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ name: 'test-group' }), usePathname: () => '/group/test-group',
}));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/auth/auth-provider', () => ({ useAuth: () => ({ session: null }) }));
jest.mock('@/lib/use-connectivity', () => ({ useIsOffline: () => false }));
jest.mock('@/features/discussions/topic-composer', () => ({ TopicComposer: () => null }));
jest.mock('@/features/community/use-community', () => ({
  usePublicCommunity: () => mockCommunity,
  usePublicCommunityTopics: () => mockTopics,
  usePublicGroup: () => mockGroup,
  usePublicGroupTopics: () => mockTopics,
}));

const group: PublicGroupDetail = {
  name: 'test-group', title: '保留的小组', memberCount: 123,
  description: '保留的小组介绍', topicCount: 1,
};
const pages = [
  { name: '社区', Component: CommunityScreen, getQuery: () => mockCommunity,
    data: { groups: [group] }, loading: '正在读取 Bangumi 社区…',
    paused: '网络暂不可用，恢复连接后可重试社区资料。', error: '社区内容加载失败，请检查网络后重试。',
    retry: '重试加载社区资料', loaded: group.title },
  { name: '小组', Component: GroupScreen, getQuery: () => mockGroup,
    data: group, loading: '正在读取小组资料…',
    paused: '网络暂不可用，恢复连接后可重试小组资料。', error: '小组加载失败，请检查网络后重试。',
    retry: '重试加载小组资料', loaded: group.description },
];

beforeEach(() => {
  mockCommunity = makeQuery(); mockGroup = makeQuery(); mockTopics = makeQuery();
  Object.assign(mockTopics, {
    data: { pages: [{ items: [{ id: 1, title: '保留的话题', author: '作者', replyCount: 2, updatedAt: Date.now() }], total: 1 }] },
    isPending: false, fetchStatus: 'idle',
  });
});

test.each(pages)('$name metadata shows a paused request and retries only that request', async ({ Component, getQuery, loading, paused, error, retry }) => {
  const query = getQuery();
  const screen = await render(<Component />);
  expect(screen.getByText(loading)).toBeTruthy();

  Object.assign(query, { fetchStatus: 'paused', isPaused: true });
  await screen.rerender(<Component />);
  expect(screen.getByText(paused)).toBeTruthy();
  expect(screen.queryByText(loading)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: retry }));
  expect(query.refetch).toHaveBeenCalledTimes(1);
  expect(mockTopics.refetch).not.toHaveBeenCalled();

  Object.assign(query, { fetchStatus: 'fetching', isPaused: false });
  await screen.rerender(<Component />);
  expect(screen.getByText(loading)).toBeTruthy();
  expect(screen.queryByText(paused)).toBeNull();

  Object.assign(query, { fetchStatus: 'idle', isPending: false, isError: true });
  await screen.rerender(<Component />);
  expect(screen.getByText(error)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: retry }));
  expect(query.refetch).toHaveBeenCalledTimes(2);
  expect(mockTopics.refetch).not.toHaveBeenCalled();
});

test.each(pages)('$name retains metadata and topic rows while refresh pauses or fails', async ({ Component, getQuery, data, loaded, loading }) => {
  const query = getQuery();
  Object.assign(query, { data, isPending: false, isRefetching: true });
  const screen = await render(<Component />);
  expect(screen.getByText(loaded)).toBeTruthy();
  expect(screen.queryByText(loading)).toBeNull();

  Object.assign(query, { fetchStatus: 'paused', isPaused: true, isRefetching: false });
  await screen.rerender(<Component />);
  expect(screen.getByText(loaded)).toBeTruthy();
  expect(screen.getByText('保留的话题')).toBeTruthy();
  expect(screen.getByText('当前显示上次保存的内容')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '重新获取最新内容' }));
  expect(query.refetch).toHaveBeenCalledTimes(1);
  expect(mockTopics.refetch).not.toHaveBeenCalled();

  Object.assign(query, { fetchStatus: 'idle', isPaused: false, isError: true });
  await screen.rerender(<Component />);
  expect(screen.getByText(loaded)).toBeTruthy();
  expect(screen.getByText('保留的话题')).toBeTruthy();
  expect(screen.getByText('当前显示上次保存的内容')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '重新获取最新内容' }));
  expect(query.refetch).toHaveBeenCalledTimes(2);
  expect(mockTopics.refetch).not.toHaveBeenCalled();

  query.isError = false;
  await screen.rerender(<Component />);
  expect(screen.getByText(loaded)).toBeTruthy();
  expect(screen.queryByText('当前显示上次保存的内容')).toBeNull();
});
