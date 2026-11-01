import type { ReactNode } from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import PublicIndexScreen from '@/app/directory/[id]';
import type { PublicIndexDetail, PublicIndexItemPage } from '@/features/indexes/model';

function makeQuery<TData>() {
  return {
    data: undefined as TData | undefined,
    fetchStatus: 'fetching', isPending: true, isPaused: false, isError: false, isRefetching: false,
    isFetchingNextPage: false, isFetchNextPageError: false, hasNextPage: false,
    refetch: jest.fn(), fetchNextPage: jest.fn(),
  };
}

let mockIndex = makeQuery<PublicIndexDetail>();
let mockItems = makeQuery<{ pages: PublicIndexItemPage[] }>();

jest.mock('expo-router', () => {
  const Link = ({ children }: { children: ReactNode }) => children;
  Link.AppleZoom = ({ children }: { children: ReactNode }) => children;
  return {
    Link, router: { push: jest.fn() }, Stack: { Screen: () => null },
    useLocalSearchParams: () => ({ id: '1' }), usePathname: () => '/directory/1',
  };
});
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/lib/use-connectivity', () => ({ useIsOffline: () => false }));
jest.mock('@/features/auth/auth-provider', () => ({ useAuth: () => ({ session: null }) }));
jest.mock('@/features/indexes/use-indexes', () => ({
  usePublicIndex: () => mockIndex, usePublicIndexItems: () => mockItems,
}));
jest.mock('@/features/indexes/use-create-index', () => ({ useDeleteIndex: () => ({ mutate: jest.fn() }) }));
jest.mock('@/features/indexes/use-index-collection', () => ({
  useIndexCollection: () => ({ data: false }),
  useSetIndexCollection: () => ({ isPending: false, mutate: jest.fn() }),
}));
jest.mock('@/features/indexes/index-composer', () => ({ IndexComposer: () => null }));
jest.mock('@/features/shared/app-action-menu', () => ({ AppActionMenu: () => null }));

const index: PublicIndexDetail = {
  id: 1, title: '保留的目录资料', author: '作者', description: '保留的目录介绍',
  itemCount: 1, collects: 2, replyCount: 0, updatedAt: Date.UTC(2026, 9, 1),
};
const items: { pages: PublicIndexItemPage[] } = {
  pages: [{ items: [{ id: 2, title: '保留的收录条目', kind: 'subject', comment: '' }], total: 1 }],
};
const sections = [
  { name: '资料', getQuery: () => mockIndex, getOtherQuery: () => mockItems,
    loading: '正在读取目录内容…', paused: '网络暂不可用，恢复连接后可重试目录资料。',
    error: '目录读取失败，请检查网络后重试。', retry: '重试加载目录资料', cachedRetry: '重新获取目录资料',
    successData: index, successText: index.description },
  { name: '条目', getQuery: () => mockItems, getOtherQuery: () => mockIndex,
    loading: '条目加载中', paused: '目录条目读取已暂停', error: '目录条目读取失败',
    retry: '重试加载目录条目', cachedRetry: '重新获取目录条目',
    successData: { pages: [{ items: [], total: 0 }] }, successText: '暂无条目' },
];

beforeEach(() => {
  mockIndex = makeQuery(); mockItems = makeQuery();
  Object.assign(mockIndex, { data: index, fetchStatus: 'idle', isPending: false });
  Object.assign(mockItems, { data: items, fetchStatus: 'idle', isPending: false });
});

test.each(sections)('directory $name exposes first-load pause and error with an independent retry', async ({ getQuery, getOtherQuery, loading, paused, error, retry, successData, successText }) => {
  const query = getQuery();
  Object.assign(query, { data: undefined, fetchStatus: 'fetching', isPending: true });
  const screen = await render(<PublicIndexScreen />);
  expect(screen.getByText(loading)).toBeTruthy();

  Object.assign(query, { fetchStatus: 'paused', isPaused: true });
  await screen.rerender(<PublicIndexScreen />);
  expect(screen.getByText(paused)).toBeTruthy();
  expect(screen.queryByText(loading)).toBeNull();
  expect(screen.queryByText('暂无条目')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: retry }));
  expect(query.refetch).toHaveBeenCalledTimes(1);
  expect(getOtherQuery().refetch).not.toHaveBeenCalled();

  Object.assign(query, { fetchStatus: 'fetching', isPaused: false });
  await screen.rerender(<PublicIndexScreen />);
  expect(screen.getByText(loading)).toBeTruthy();

  Object.assign(query, { fetchStatus: 'idle', isPending: false, isError: true });
  await screen.rerender(<PublicIndexScreen />);
  expect(screen.getByText(error)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: retry }));
  expect(query.refetch).toHaveBeenCalledTimes(2);
  expect(getOtherQuery().refetch).not.toHaveBeenCalled();

  Object.assign(query, { data: successData, isError: false });
  await screen.rerender(<PublicIndexScreen />);
  expect(screen.getByText(successText)).toBeTruthy();
  expect(screen.queryByText(error)).toBeNull();
});

test.each(sections)('directory $name refresh keeps both sections readable when paused or failed', async ({ getQuery, getOtherQuery, cachedRetry }) => {
  const query = getQuery();
  Object.assign(query, { fetchStatus: 'fetching', isRefetching: true });
  const screen = await render(<PublicIndexScreen />);
  expect(screen.getByText(index.description)).toBeTruthy();
  expect(screen.getByText('保留的收录条目')).toBeTruthy();

  Object.assign(query, { fetchStatus: 'paused', isPaused: true, isRefetching: false });
  await screen.rerender(<PublicIndexScreen />);
  expect(screen.getByText(index.description)).toBeTruthy();
  expect(screen.getByText('保留的收录条目')).toBeTruthy();
  expect(screen.getByText('当前显示上次保存的内容')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: cachedRetry }));
  expect(query.refetch).toHaveBeenCalledTimes(1);
  expect(getOtherQuery().refetch).not.toHaveBeenCalled();

  Object.assign(query, { fetchStatus: 'idle', isPaused: false, isError: true });
  await screen.rerender(<PublicIndexScreen />);
  expect(screen.getByText(index.description)).toBeTruthy();
  expect(screen.getByText('保留的收录条目')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: cachedRetry }));
  expect(query.refetch).toHaveBeenCalledTimes(2);
  expect(getOtherQuery().refetch).not.toHaveBeenCalled();

  query.isError = false;
  await screen.rerender(<PublicIndexScreen />);
  expect(screen.queryByText('当前显示上次保存的内容')).toBeNull();
});

test('simultaneous directory refresh failures have distinct retry controls', async () => {
  mockIndex.isError = true; mockItems.isError = true;
  const screen = await render(<PublicIndexScreen />);
  expect(screen.getByText(index.description)).toBeTruthy();
  expect(screen.getByText('保留的收录条目')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '重新获取目录资料' }));
  expect(mockIndex.refetch).toHaveBeenCalledTimes(1);
  expect(mockItems.refetch).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: '重新获取目录条目' }));
  expect(mockIndex.refetch).toHaveBeenCalledTimes(1);
  expect(mockItems.refetch).toHaveBeenCalledTimes(1);
});
