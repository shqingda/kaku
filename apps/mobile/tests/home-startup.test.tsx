import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from 'expo-router';
import { createElement } from 'react';
import { RefreshControl, View } from 'react-native';

import HomeScreen from '@/app/index';
import type { AuthSession } from '@/features/auth/model';
import { prefetchChannel } from '@/features/channels/use-channel';
import { prefetchCommunity } from '@/features/community/use-community';
import { prefetchExplore, prefetchRankings } from '@/features/discover/use-discover';
import type { FriendTimelineItem } from '@/features/timeline/model';
import type { HomeMediaSection } from '@/features/home/home-media-section';
import { getPublicUserCollections } from '@/infrastructure/bangumi/users/provider';
import { queryKeys } from '@/lib/query-keys';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), prefetch: jest.fn() } }));
jest.mock('@/features/auth/auth-provider', () => ({ useAuth: () => ({ session: mockSession, isLoading: false }) }));
jest.mock('@/features/preferences/view-preferences', () => ({ readHomeTrackingType: () => 2, saveHomeTrackingType: jest.fn() }));
jest.mock('@/features/channels/use-channel', () => ({ prefetchChannel: jest.fn() }));
jest.mock('@/features/community/use-community', () => ({ prefetchCommunity: jest.fn() }));
jest.mock('@/features/discover/use-discover', () => ({ prefetchExplore: jest.fn(), prefetchRankings: jest.fn() }));
jest.mock('@/features/home/home-header', () => ({ HomeHeader: () => null }));
jest.mock('@/features/home/home-media-section', () => {
  const { Pressable, Text, View } = require('react-native');
  return {
    HomeMediaSection: ({ items, onSubjectTypeChange, onSubjectTypePressIn, subjectType }: React.ComponentProps<typeof HomeMediaSection>) => (
      <View>
        <Text>{`当前类型 ${subjectType}`}</Text>
        {items.map((item) => <Text key={item.id}>{item.title}</Text>)}
        {[1, 2].map((type) => (
          <Pressable key={type} accessibilityLabel={`切换类型 ${type}`} onPress={() => onSubjectTypeChange(type)} onPressIn={() => onSubjectTypePressIn?.(type)} />
        ))}
      </View>
    ),
  };
});
jest.mock('@/features/timeline/friend-timeline-row', () => {
  const { Text } = require('react-native');
  return { FriendTimelineRow: ({ item }: { item: FriendTimelineItem }) => <Text>{item.text}</Text> };
});
jest.mock('@/features/timeline/timeline-composer', () => ({ TimelineComposer: () => null }));
jest.mock('@/features/timeline/use-friend-timeline', () => ({ useFriendTimeline: () => mockTimeline }));
jest.mock('@/infrastructure/bangumi/users/provider', () => ({ getPublicUserCollections: jest.fn() }));

let mockSession: AuthSession | null;
let mockTimeline: {
  data: { pages: { items: FriendTimelineItem[] }[] };
  isPending: boolean;
  isError: boolean;
  isRefetching: boolean;
  refetch: jest.Mock;
};
let client: QueryClient;

// The native test renderer drops RefreshControl event props; expose its existing
// handler through a test View, as in app-refresh-control.test.tsx.
const refreshControlSpy = jest.spyOn(RefreshControl.prototype, 'render').mockImplementation(
  function (this: { props: Record<string, unknown> }) {
    return createElement(View, { ...this.props, testID: 'home-refresh-control' });
  },
);
afterAll(() => refreshControlSpy.mockRestore());

beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  mockSession = { user: { id: 1, username: 'tester', nickname: 'Tester' } } as AuthSession;
  mockTimeline = {
    data: { pages: [{ items: [] }] },
    isPending: false, isError: false, isRefetching: false,
    refetch: jest.fn().mockResolvedValue(undefined),
  };
  jest.mocked(getPublicUserCollections).mockImplementation(async (_username, type) => ({
    items: [{ id: type, subjectType: type, title: `已保存的类型 ${type}`, progress: 0, volumeProgress: 0, totalEpisodes: 1, updatedAt: '' }],
    total: 1,
  }));
});

afterEach(async () => {
  await cleanup();
  client.clear();
});

async function renderHome() {
  return render(<QueryClientProvider client={client}><HomeScreen /></QueryClientProvider>);
}

test('guest startup leaves discovery requests until a discovery entry is pressed', async () => {
  mockSession = null;
  await renderHome();

  expect(screen.getByText('从记录开始')).toBeTruthy();
  expect(getPublicUserCollections).not.toHaveBeenCalled();
  expect(router.prefetch).not.toHaveBeenCalled();
  for (const prefetch of [prefetchChannel, prefetchCommunity, prefetchExplore, prefetchRankings]) {
    expect(prefetch).not.toHaveBeenCalled();
  }

  await fireEvent(screen.getByLabelText('综合'), 'pressIn');
  expect(prefetchExplore).toHaveBeenCalledWith(client);
  await fireEvent.press(screen.getByLabelText('综合'));
  expect(router.push).toHaveBeenCalledWith('/explore');
});

test('switching tracking types observes only the selected cache and refreshes only visible home data', async () => {
  await renderHome();
  await waitFor(() => expect(screen.getByText('已保存的类型 2')).toBeTruthy());
  expect(getPublicUserCollections).toHaveBeenCalledTimes(1);
  expect(router.prefetch).not.toHaveBeenCalled();

  await fireEvent(screen.getByLabelText('切换类型 1'), 'pressIn');
  await waitFor(() => expect(client.getQueryData(queryKeys.publicUserCollections('tester', 1, 'doing'))).toBeDefined());
  await fireEvent.press(screen.getByLabelText('切换类型 1'));
  await waitFor(() => expect(screen.getByText('已保存的类型 1')).toBeTruthy());
  expect(getPublicUserCollections).toHaveBeenCalledTimes(2);
  expect(client.getQueryCache().findAll().filter((query) => query.getObserversCount() > 0)).toHaveLength(1);
  expect(client.getQueryCache().find({ queryKey: queryKeys.publicUserCollections('tester', 2, 'doing') })?.getObserversCount()).toBe(0);

  jest.mocked(getPublicUserCollections).mockClear();
  await fireEvent(screen.getByTestId('home-refresh-control'), 'refresh');
  await waitFor(() => expect(getPublicUserCollections).toHaveBeenCalledTimes(1));
  expect(getPublicUserCollections).toHaveBeenCalledWith('tester', 1, 0, 'doing', expect.any(AbortSignal));
  expect(mockTimeline.refetch).toHaveBeenCalledTimes(1);

  await fireEvent.press(screen.getByLabelText('切换类型 2'));
  await waitFor(() => expect(screen.getByText('已保存的类型 2')).toBeTruthy());
  expect(getPublicUserCollections).toHaveBeenCalledTimes(1);
});

test('a failed timeline refresh keeps cached posts and exposes retry', async () => {
  mockTimeline.isError = true;
  mockTimeline.data.pages[0].items = [{
    id: 1, createdAt: 1, replies: 0, text: '上次保存的动态',
    user: { username: 'friend', nickname: 'Friend' },
  }];
  const view = await renderHome();

  expect(screen.getByText('上次保存的动态')).toBeTruthy();
  expect(screen.getByText('当前显示上次保存的内容')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('重新获取最新内容'));
  expect(mockTimeline.refetch).toHaveBeenCalledTimes(1);

  mockTimeline.isError = false;
  await view.rerender(<QueryClientProvider client={client}><HomeScreen /></QueryClientProvider>);
  expect(screen.getByText('上次保存的动态')).toBeTruthy();
  expect(screen.queryByText('当前显示上次保存的内容')).toBeNull();
});

test('a failed timeline without cached posts remains an explicit retry state', async () => {
  mockTimeline.isError = true;
  await renderHome();

  expect(screen.queryByText('当前显示上次保存的内容')).toBeNull();
  expect(screen.queryByText('还没有好友动态')).toBeNull();
  await fireEvent.press(screen.getByText('暂时没有加载出来，点此重试'));
  expect(mockTimeline.refetch).toHaveBeenCalledTimes(1);
});
