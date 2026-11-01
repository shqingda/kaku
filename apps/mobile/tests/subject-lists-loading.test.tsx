import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import SubjectCommentsScreen from '@/app/subject/[id]/comments';
import SubjectIndexesScreen from '@/app/subject/[id]/indexes';
import SubjectReviewsScreen from '@/app/subject/[id]/reviews';
import type { PublicIndexPage } from '@/features/indexes/model';
import type { SubjectCommentPage, SubjectReviewPage } from '@/features/reviews/model';

function makeQuery<TPage>() {
  return {
    data: undefined as { pages: TPage[] } | undefined,
    fetchStatus: 'fetching', isPending: true, isPaused: false, isError: false, isRefetching: false,
    isFetchingNextPage: false, isFetchNextPageError: false, hasNextPage: false,
    refetch: jest.fn(), fetchNextPage: jest.fn(),
  };
}

let mockComments = makeQuery<SubjectCommentPage>();
let mockReviews = makeQuery<SubjectReviewPage>();
let mockIndexes = makeQuery<PublicIndexPage>();

jest.mock('expo-router', () => ({
  router: { push: jest.fn() }, Stack: { Screen: () => null }, useLocalSearchParams: () => ({ id: '1' }),
}));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/lib/use-connectivity', () => ({ useIsOffline: () => false }));
jest.mock('@/features/reviews/use-subject-reviews', () => ({
  useSubjectComments: () => mockComments, useSubjectReviews: () => mockReviews,
}));
jest.mock('@/features/indexes/use-indexes', () => ({ useSubjectIndexes: () => mockIndexes }));

const comment = { id: '2', author: '作者', body: '已保存的吐槽', updatedAt: Date.UTC(2026, 9, 1) };
const review = { id: '3', author: '作者', title: '已保存的评论', summary: '评论摘要', replyCount: 2, updatedAt: Date.UTC(2026, 9, 1) };
const index = { id: 4, author: '作者', title: '已保存的目录', itemCount: 3, updatedAt: Date.UTC(2026, 9, 1) };
const pages = [
  { name: '吐槽', Component: SubjectCommentsScreen, getQuery: () => mockComments,
    data: { pages: [{ items: [comment], total: 1 }] }, loading: '正在读取 Bangumi 吐槽…',
    paused: '网络暂不可用，恢复连接后可重试吐槽。', error: '吐槽加载失败，请检查网络后重试。',
    retry: '重试加载吐槽', empty: '暂无吐槽', loaded: comment.body },
  { name: '评论', Component: SubjectReviewsScreen, getQuery: () => mockReviews,
    data: { pages: [{ items: [review], total: 1 }] }, loading: '正在读取 Bangumi 评论…',
    paused: '网络暂不可用，恢复连接后可重试评论。', error: '评论加载失败，请检查网络后重试。',
    retry: '重试加载评论', empty: '暂无评论', loaded: review.title },
  { name: '目录', Component: SubjectIndexesScreen, getQuery: () => mockIndexes,
    data: { pages: [{ items: [index], total: 1 }] }, loading: '正在读取相关目录…',
    paused: '网络暂不可用，恢复连接后可重试目录。', error: '目录加载失败，请检查网络后重试。',
    retry: '重试加载目录', empty: '暂无相关目录', loaded: index.title },
];

beforeEach(() => {
  mockComments = makeQuery(); mockReviews = makeQuery(); mockIndexes = makeQuery();
  jest.mocked(router.push).mockClear();
});

test.each(pages)('$name distinguishes loading, paused, failed, and successfully empty states', async ({ Component, getQuery, loading, paused, error, retry, empty }) => {
  const query = getQuery();
  const screen = await render(<Component />);
  expect(screen.getByText(loading)).toBeTruthy();

  Object.assign(query, { fetchStatus: 'paused', isPaused: true });
  await screen.rerender(<Component />);
  expect(screen.getByText(paused)).toBeTruthy();
  expect(screen.queryByText(loading)).toBeNull();
  expect(screen.queryByText(empty)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: retry }));
  expect(query.refetch).toHaveBeenCalledTimes(1);

  Object.assign(query, { fetchStatus: 'fetching', isPaused: false });
  await screen.rerender(<Component />);
  expect(screen.getByText(loading)).toBeTruthy();

  Object.assign(query, { fetchStatus: 'idle', isPending: false, isError: true });
  await screen.rerender(<Component />);
  expect(screen.getByText(error)).toBeTruthy();
  expect(screen.queryByText(empty)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: retry }));
  expect(query.refetch).toHaveBeenCalledTimes(2);

  Object.assign(query, { isError: false, data: { pages: [{ items: [], total: 0 }] } });
  await screen.rerender(<Component />);
  expect(screen.getByText(empty)).toBeTruthy();
  expect(screen.queryByText(error)).toBeNull();
});

test.each(pages)('$name preserves its rows and exposes refresh failure and pause', async ({ Component, getQuery, data, loaded, loading }) => {
  const query = getQuery();
  Object.assign(query, { data, isPending: false, isRefetching: true });
  const screen = await render(<Component />);
  expect(screen.getByText(loaded)).toBeTruthy();
  expect(screen.queryByText(loading)).toBeNull();

  Object.assign(query, { fetchStatus: 'paused', isPaused: true, isRefetching: false });
  await screen.rerender(<Component />);
  expect(screen.getByText(loaded)).toBeTruthy();
  expect(screen.getByText('当前显示上次保存的内容')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '重新获取最新内容' }));
  expect(query.refetch).toHaveBeenCalledTimes(1);

  Object.assign(query, { fetchStatus: 'idle', isPaused: false, isError: true });
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

test.each([
  { Component: SubjectReviewsScreen, getQuery: () => mockReviews, data: pages[1]!.data,
    label: `打开评论：${review.title}`, target: { pathname: '/subject/[id]/review/[reviewId]', params: { id: '1', reviewId: review.id } } },
  { Component: SubjectIndexesScreen, getQuery: () => mockIndexes, data: pages[2]!.data,
    label: `打开目录：${index.title}`, target: { pathname: '/directory/[id]', params: { id: String(index.id) } } },
])('$label remains navigable after a refresh fails', async ({ Component, getQuery, data, label, target }) => {
  Object.assign(getQuery(), { data, isPending: false, isError: true, fetchStatus: 'idle' });
  const screen = await render(<Component />);
  await fireEvent.press(screen.getByRole('button', { name: label }));
  expect(router.push).toHaveBeenCalledWith(target);
});
