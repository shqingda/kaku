import type { ReactNode } from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import DirectoriesScreen from '@/app/directories';
import FriendTimelineScreen from '@/app/timeline';
import WikiScreen from '@/app/wiki';
import type { PublicIndexSummary } from '@/features/indexes/model';
import type { FriendTimelineItem } from '@/features/timeline/model';
import type { PublicWikiRevision } from '@/features/wiki/model';

function makeQuery<TData>() {
  return {
    data: undefined as TData | undefined,
    fetchStatus: 'fetching', isPending: true, isError: false, isRefetching: false,
    isFetchingNextPage: false, isFetchNextPageError: false, hasNextPage: false,
    refetch: jest.fn(), fetchNextPage: jest.fn(),
  };
}

let mockIndexes = makeQuery<{ pages: { items: PublicIndexSummary[] }[] }>();
let mockTimeline = makeQuery<{ pages: { items: FriendTimelineItem[] }[] }>();
let mockWiki = makeQuery<{ items: PublicWikiRevision[] }>();
let mockOffline = false;

jest.mock('expo-router', () => ({
  router: { push: jest.fn() }, Stack: { Screen: () => null }, usePathname: () => '/directories',
}));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/auth/auth-provider', () => ({ useAuth: () => ({ session: { user: { id: 1 } } }) }));
jest.mock('@/lib/use-connectivity', () => ({ useIsOffline: () => mockOffline }));
jest.mock('@/features/indexes/use-global-indexes', () => ({ useGlobalIndexes: () => mockIndexes }));
jest.mock('@/features/timeline/use-friend-timeline', () => ({ useFriendTimeline: () => mockTimeline }));
jest.mock('@/features/wiki/use-wiki-revisions', () => ({ useWikiRevisions: () => mockWiki }));
jest.mock('@/features/indexes/index-composer', () => ({ IndexComposer: () => null }));
jest.mock('@/features/timeline/timeline-composer', () => ({ TimelineComposer: () => null }));
jest.mock('@/features/shared/bangumi-text', () => {
  const { Text } = require('react-native');
  return { BangumiText: ({ children }: { children: ReactNode }) => <Text>{children}</Text> };
});

const directory: PublicIndexSummary = {
  id: 1, title: '已加载目录', author: '作者', itemCount: 3, updatedAt: Date.UTC(2026, 9, 1),
};
const timeline: FriendTimelineItem = {
  id: 2, text: '已加载好友动态', replies: 0, createdAt: Date.UTC(2026, 9, 1),
  user: { username: 'friend', nickname: '好友' },
};
const revision: PublicWikiRevision = {
  subjectId: 3, title: '已加载修订', note: '修订说明', author: '作者', authorUsername: 'author',
  editedAt: Date.UTC(2026, 9, 1), revisionUrl: 'https://bgm.tv/subject/3/edit_detail',
};
const pages = [
  { name: '目录', Component: DirectoriesScreen, getQuery: () => mockIndexes,
    data: { pages: [{ items: [directory] }] }, loading: '目录加载中', error: '目录读取失败', retry: '重试', loaded: directory.title },
  { name: '好友动态', Component: FriendTimelineScreen, getQuery: () => mockTimeline,
    data: { pages: [{ items: [timeline] }] }, loading: '正在读取好友动态', error: '好友动态读取失败', retry: '重试加载好友动态', loaded: timeline.text },
  { name: '维基动态', Component: WikiScreen, getQuery: () => mockWiki,
    data: { items: [revision] }, loading: '正在读取维基动态', error: '维基动态读取失败', retry: '重试', loaded: revision.title },
];

beforeEach(() => {
  mockIndexes = makeQuery(); mockTimeline = makeQuery(); mockWiki = makeQuery(); mockOffline = false;
});

test.each(pages)('$name exposes an initial paused read and retries after reconnect', async ({ Component, getQuery, loading, error, retry }) => {
  const query = getQuery();
  const screen = await render(<Component />);
  expect(screen.getByText(loading)).toBeTruthy();

  query.fetchStatus = 'paused'; mockOffline = true;
  await screen.rerender(<Component />);
  expect(screen.getByText('当前离线')).toBeTruthy();
  expect(screen.queryByText(loading)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: retry }));
  expect(query.refetch).toHaveBeenCalledTimes(1);

  query.fetchStatus = 'fetching'; mockOffline = false;
  await screen.rerender(<Component />);
  expect(screen.getByText(loading)).toBeTruthy();

  Object.assign(query, { fetchStatus: 'idle', isPending: false, isError: true });
  await screen.rerender(<Component />);
  expect(screen.getByText(error)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: retry }));
  expect(query.refetch).toHaveBeenCalledTimes(2);
});

test.each(pages)('$name keeps existing rows visible when a refresh pauses or fails', async ({ Component, getQuery, data, loaded }) => {
  const query = getQuery();
  Object.assign(query, { data, isPending: false, isRefetching: true });
  const screen = await render(<Component />);
  expect(screen.getByText(loaded)).toBeTruthy();

  query.fetchStatus = 'paused'; query.isRefetching = false; mockOffline = true;
  await screen.rerender(<Component />);
  expect(screen.getByText(loaded)).toBeTruthy();
  expect(screen.getByText('当前显示上次保存的内容')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '重新获取最新内容' }));
  expect(query.refetch).toHaveBeenCalledTimes(1);

  query.fetchStatus = 'idle'; query.isError = true; mockOffline = false;
  await screen.rerender(<Component />);
  expect(screen.getByText(loaded)).toBeTruthy();
  expect(screen.getByText('当前显示上次保存的内容')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '重新获取最新内容' }));
  expect(query.refetch).toHaveBeenCalledTimes(2);

  query.isError = false;
  await screen.rerender(<Component />);
  expect(screen.getByText(loaded)).toBeTruthy();
  expect(screen.queryByText('当前显示上次保存的内容')).toBeNull();
});
