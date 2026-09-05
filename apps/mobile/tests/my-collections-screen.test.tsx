import { fireEvent, render, screen } from '@testing-library/react-native';
import Storage from 'expo-sqlite/kv-store';
import { MyCollectionsScreen } from '@/features/collections/my-collections-screen';

jest.mock('@/features/shared/app-state', () => {
  const { Text, View } = require('react-native');
  return { AppState: ({ title, text }: { title: string; text: string }) => <View><Text>{title}</Text><Text>{text}</Text></View> };
});
jest.mock('expo-router', () => ({ Stack: { Screen: () => null }, router: { push: jest.fn() } }));
jest.mock('@/features/auth/auth-provider', () => ({ useAuth: () => ({ session: { user: { id: 1, username: 'tester' } } }) }));
jest.mock('@/features/collections/collection-row-editor', () => ({ CollectionRowEditor: () => null }));
jest.mock('@/features/users/public-user-collection-row', () => ({ PublicUserCollectionRow: () => null }));
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItemSync: jest.fn(), setItemSync: jest.fn() } }));
jest.mock('@/features/collections/use-my-collections', () => ({ useMyCollections: () => mockState }));
let mockState: ReturnType<typeof makeState>;
function makeState() {
  return { complete: true, items: [], total: 0, query: {
    fetchStatus: 'idle', isError: false, isPending: false, hasNextPage: false,
    isFetching: false, isRefetching: false, isFetchingNextPage: false, isFetchNextPageError: false,
    refetch: jest.fn(), fetchNextPage: jest.fn(),
  } };
}
beforeEach(() => {
  mockState = makeState();
  jest.mocked(Storage.getItemSync).mockReset().mockReturnValue(null);
  jest.mocked(Storage.setItemSync).mockReset();
});
test('keeps the collection search without exposing sort controls', async () => {
  await render(<MyCollectionsScreen userId={1} />);
  expect(screen.getByLabelText('搜索我的完整收藏')).toBeTruthy();
  expect(screen.queryByText('名称排序')).toBeNull();
  expect(screen.queryByText('最近更新')).toBeNull();
});
test('an incomplete terminal page exposes refresh rather than an empty result', async () => {
  mockState.complete = false;
  mockState.total = 2;
  await render(<MyCollectionsScreen userId={1} />);
  expect(screen.queryByText('没有匹配的收藏')).toBeNull();
  await fireEvent.press(screen.getByLabelText('刷新完整收藏'));
  expect(mockState.query.refetch).toHaveBeenCalledTimes(1);
});
test('offline initial load is explicitly offline, not a loading placeholder', async () => {
  mockState.complete = false;
  mockState.query.isPending = true;
  mockState.query.fetchStatus = 'paused';
  await render(<MyCollectionsScreen userId={1} />);
  expect(screen.getByText('当前离线')).toBeTruthy();
  expect(screen.queryByText('收藏加载中')).toBeNull();
});
test('preference read failure is visible and the current filters can be saved', async () => {
  jest.mocked(Storage.getItemSync).mockImplementationOnce(() => { throw new Error('disk'); });
  await render(<MyCollectionsScreen userId={1} />);
  expect(screen.getByText('筛选偏好读取失败，本次使用默认条件')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('保存当前筛选'));
  expect(Storage.setItemSync).toHaveBeenCalledWith('kaku:collection-search:v1:1', expect.any(String));
  expect(screen.queryByText('筛选偏好读取失败，本次使用默认条件')).toBeNull();
});
