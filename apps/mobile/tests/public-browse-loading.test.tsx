import type { ComponentType, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';

import GlobalBlogsScreen from '@/app/blogs';
import BrowseScreen from '@/app/browse';
import PeopleScreen from '@/app/people';
import TagsScreen from '@/app/tags';
import type { GlobalBlog } from '@/features/blogs/model';
import type { DiscoverSubject } from '@/features/discover/model';
import type { PublicPersonSummary } from '@/features/people-browser/model';
import type { PublicTag } from '@/features/tags/model';

type PublicItem = DiscoverSubject | PublicPersonSummary | GlobalBlog | PublicTag;
type QueryName = 'browse' | 'people' | 'peopleSearch' | 'blogs' | 'tags';

function makeQuery() {
  return {
    data: undefined as { pages: { items: PublicItem[]; total: number }[] } | undefined,
    fetchStatus: 'fetching', isPending: true, isError: false, isRefetching: false,
    isFetchingNextPage: false, isFetchNextPageError: false, hasNextPage: false,
    refetch: jest.fn(), fetchNextPage: jest.fn(),
  };
}

function makeQueries() {
  return { browse: makeQuery(), people: makeQuery(), peopleSearch: makeQuery(), blogs: makeQuery(), tags: makeQuery() };
}

let mockQueries = makeQueries();
let mockOffline = false;
let mockRouteParams: { type?: string } = {};

jest.mock('expo-router', () => ({
  router: { push: jest.fn() }, Stack: { Screen: () => null }, useLocalSearchParams: () => mockRouteParams,
  Link: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/lib/use-connectivity', () => ({ useIsOffline: () => mockOffline }));
jest.mock('@/features/browse/use-browse-subjects', () => ({ useBrowseSubjects: () => mockQueries.browse }));
jest.mock('@/features/people-browser/use-global-people', () => ({ useGlobalPeople: () => mockQueries.people }));
jest.mock('@/features/people-browser/use-people-search', () => ({ usePeopleSearch: () => mockQueries.peopleSearch }));
jest.mock('@/features/blogs/use-global-blogs', () => ({ useGlobalBlogs: () => mockQueries.blogs }));
jest.mock('@/features/tags/use-global-tags', () => ({ useGlobalTags: () => mockQueries.tags }));
jest.mock('@/features/catalog/use-catalog-subject', () => ({
  usePrefetchSubject: () => ({ prefetch: jest.fn(), cancel: jest.fn() }),
}));
jest.mock('@/features/people/use-public-entity', () => ({ prefetchCharacter: jest.fn(), prefetchPerson: jest.fn() }));

type PageCase = {
  name: string;
  Component: ComponentType;
  query: QueryName;
  loading: string;
  loadingByLabel?: boolean;
  error: string;
  empty: string;
  retryLabel?: string;
  item: PublicItem;
  loadedText: string;
};

const person: PublicPersonSummary = {
  id: 2, kind: 'character', name: '已加载人物', categories: [], commentCount: 0, metadata: '',
};
const pages: PageCase[] = [
  { name: '分类浏览', Component: BrowseScreen, query: 'browse', loading: '正在筛选条目',
    error: '分类浏览失败', empty: '没有匹配条目', retryLabel: '重试分类浏览',
    item: { id: 1, title: '已加载条目', type: 2 }, loadedText: '已加载条目' },
  { name: '人物浏览', Component: PeopleScreen, query: 'people', loading: '人物加载中',
    error: '人物读取失败', empty: '暂无人物', item: person, loadedText: person.name },
  { name: '人物搜索', Component: PeopleScreen, query: 'peopleSearch', loading: '正在搜索',
    error: '搜索失败', empty: '没有搜索结果', item: person, loadedText: person.name },
  { name: '公开日志', Component: GlobalBlogsScreen, query: 'blogs', loading: '日志加载中', loadingByLabel: true,
    error: '日志读取失败', empty: '暂无日志', item: { id: 3, title: '已加载日志', summary: '',
      author: '作者', authorUsername: 'author', replyCount: 0, updatedAt: Date.UTC(2026, 9, 1) }, loadedText: '已加载日志' },
  { name: '标签', Component: TagsScreen, query: 'tags', loading: '正在读取标签',
    error: '标签加载失败', empty: '暂无标签', item: { name: '已加载标签', count: 5 }, loadedText: '已加载标签' },
];

beforeEach(() => { mockQueries = makeQueries(); mockOffline = false; mockRouteParams = {}; });

async function openPage({ Component, query }: PageCase) {
  const client = new QueryClient();
  const page = () => <QueryClientProvider client={client}><Component /></QueryClientProvider>;
  const screen = await render(page());
  if (query === 'peopleSearch') {
    const field = screen.getByLabelText('搜索角色或人物');
    await fireEvent.changeText(field, '目标');
    await fireEvent(field, 'submitEditing');
  }
  return { screen, rerender: () => screen.rerender(page()) };
}

test.each(pages)('$name distinguishes loading, paused reads, failures and empty success', async (page) => {
  const query = mockQueries[page.query];
  const { screen, rerender } = await openPage(page);
  const loadingHint = () => page.loadingByLabel
    ? screen.queryByLabelText(page.loading)
    : screen.queryByText(page.loading);
  expect(loadingHint()).toBeTruthy();

  query.fetchStatus = 'paused'; mockOffline = true;
  await rerender();
  expect(screen.getByText('当前离线')).toBeTruthy();
  expect(loadingHint()).toBeNull();
  expect(screen.queryByText(page.empty)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: page.retryLabel ?? '重试' }));
  expect(query.refetch).toHaveBeenCalledTimes(1);

  query.fetchStatus = 'fetching'; mockOffline = false;
  await rerender();
  expect(loadingHint()).toBeTruthy();
  expect(screen.queryByText('当前离线')).toBeNull();

  Object.assign(query, { fetchStatus: 'idle', isPending: false, isError: true });
  await rerender();
  expect(screen.getByText(page.error)).toBeTruthy();
  expect(screen.queryByText(page.empty)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: page.retryLabel ?? '重试' }));
  expect(query.refetch).toHaveBeenCalledTimes(2);
  if (page.query === 'peopleSearch') expect(mockQueries.people.refetch).not.toHaveBeenCalled();

  Object.assign(query, { isError: false, data: { pages: [{ items: [], total: 0 }] } });
  await rerender();
  expect(screen.getByText(page.empty)).toBeTruthy();
  expect(screen.queryByText(page.error)).toBeNull();
});

test.each(pages)('$name retains cached results during paused and failed refreshes', async (page) => {
  const query = mockQueries[page.query];
  Object.assign(query, { data: { pages: [{ items: [page.item], total: 1 }] }, isPending: false, isRefetching: true });
  const { screen, rerender } = await openPage(page);
  expect(screen.getByText(page.loadedText)).toBeTruthy();

  query.fetchStatus = 'paused'; query.isRefetching = false; mockOffline = true;
  await rerender();
  expect(screen.getByText(page.loadedText)).toBeTruthy();
  expect(screen.getByText('当前显示上次保存的内容')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '重新获取最新内容' }));
  expect(query.refetch).toHaveBeenCalledTimes(1);

  query.fetchStatus = 'idle'; query.isError = true; mockOffline = false;
  await rerender();
  expect(screen.getByText(page.loadedText)).toBeTruthy();
  expect(screen.getByText('当前显示上次保存的内容')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '重新获取最新内容' }));
  expect(query.refetch).toHaveBeenCalledTimes(2);
  if (page.query === 'peopleSearch') expect(mockQueries.people.refetch).not.toHaveBeenCalled();

  query.isError = false;
  await rerender();
  expect(screen.getByText(page.loadedText)).toBeTruthy();
  expect(screen.queryByText('当前显示上次保存的内容')).toBeNull();
});

test('tag categories retain the user selection until the route type changes', async () => {
  const screen = await render(<TagsScreen />);
  await fireEvent.press(screen.getByRole('tab', { name: '游戏分类' }));
  expect(screen.getByRole('tab', { name: '游戏分类' }).props.accessibilityState.selected).toBe(true);
  expect(screen.getByText('游戏标签')).toBeTruthy();

  await screen.rerender(<TagsScreen />);
  expect(screen.getByRole('tab', { name: '游戏分类' }).props.accessibilityState.selected).toBe(true);

  mockRouteParams = { type: 'book' };
  await screen.rerender(<TagsScreen />);
  expect(screen.getByRole('tab', { name: '书籍分类' }).props.accessibilityState.selected).toBe(true);
  expect(screen.getByText('书籍标签')).toBeTruthy();
});
