import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MyCollectionsScreen } from '@/features/collections/my-collections-screen';
import { ThemeProvider } from '@/features/theme/theme-provider';
import { getMyCollectionPage } from '@/infrastructure/kaku/collections-client';
import type { PublicUserCollection } from '@/features/users/model';

jest.mock('expo-router', () => ({ Stack: { Screen: () => null }, router: { push: jest.fn() } }));
jest.mock('@/features/auth/auth-provider', () => ({ useAuth: () => ({ session: { user: { id: 1, username: 'tester' } }, request: jest.fn() }) }));
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItemSync: () => null, setItemSync: jest.fn() } }));
jest.mock('@/infrastructure/kaku/collections-client', () => ({ getMyCollectionPage: jest.fn() }));
jest.mock('@/features/collections/collection-row-editor', () => ({ CollectionRowEditor: () => null }));
jest.mock('@/features/shared/swipeable-row', () => ({ SwipeableRow: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('@/features/catalog/use-catalog-subject', () => ({ usePrefetchSubject: () => ({ prefetch: jest.fn(), cancel: jest.fn() }) }));
jest.mock('@/lib/use-connectivity', () => {
  const { onlineManager } = require('@tanstack/react-query');
  return { useIsOffline: () => !onlineManager.isOnline() };
});
const first = { id: 1, title: '第一页条目', subjectType: 2, collectionStatus: 'doing', progress: 0, volumeProgress: 0, totalEpisodes: 1, updatedAt: '2026-09-19' } satisfies PublicUserCollection;
const second = { ...first, id: 2, title: '第二页命中' };
let client: QueryClient;
beforeEach(() => {
  jest.mocked(getMyCollectionPage).mockReset();
  onlineManager.setOnline(true);
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
});
afterEach(async () => { await cleanup(); client.clear(); onlineManager.setOnline(true); });
function Page({ visible = true }: { visible?: boolean }) {
  return <QueryClientProvider client={client}><ThemeProvider>{visible ? <MyCollectionsScreen userId={1} /> : null}</ThemeProvider></QueryClientProvider>;
}

test('typing finds a later page and clearing returns to the browsing cache', async () => {
  jest.mocked(getMyCollectionPage).mockResolvedValueOnce({ items: [first], total: 2, nextOffset: 1 });
  await render(<Page />);
  await screen.findByLabelText('打开收藏条目：第一页条目');
  jest.mocked(getMyCollectionPage).mockResolvedValueOnce({ items: [first], total: 2, nextOffset: 1 }).mockResolvedValueOnce({ items: [second], total: 2 });
  await fireEvent.changeText(screen.getByLabelText('搜索我的完整收藏'), '第二页');
  await screen.findByLabelText('打开收藏条目：第二页命中');
  expect(screen.queryByLabelText('打开收藏条目：第一页条目')).toBeNull();
  expect(getMyCollectionPage).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ offset: 1 }));
  const requests = jest.mocked(getMyCollectionPage).mock.calls.length;
  await fireEvent.changeText(screen.getByLabelText('搜索我的完整收藏'), '');
  await screen.findByLabelText('打开收藏条目：第一页条目');
  expect(getMyCollectionPage).toHaveBeenCalledTimes(requests);
});

test('an offline screen survives navigation and resumes data loading on reconnect', async () => {
  onlineManager.setOnline(false);
  jest.mocked(getMyCollectionPage).mockResolvedValue({ items: [first], total: 1 });
  const view = await render(<Page />);
  expect(screen.getByText('当前离线')).toBeTruthy();
  expect(getMyCollectionPage).not.toHaveBeenCalled();
  await view.rerender(<Page visible={false} />);
  await view.rerender(<Page />);
  expect(screen.getByText('当前离线')).toBeTruthy();
  await act(async () => { onlineManager.setOnline(true); });
  await screen.findByLabelText('打开收藏条目：第一页条目');
  await waitFor(() => expect(screen.queryByText('当前离线')).toBeNull());
});
