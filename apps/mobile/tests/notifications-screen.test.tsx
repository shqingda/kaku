import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NotificationsScreen from '@/app/notifications';
import { ThemeProvider } from '@/features/theme/theme-provider';

const mockRequest = jest.fn();
jest.mock('@/features/auth/auth-provider', () => ({ useAuth: () => ({ request: mockRequest, session: { user: { id: 1 } } }) }));
jest.mock('expo-router', () => ({ Stack: { Screen: () => null } }));
jest.mock('@/lib/use-connectivity', () => ({ useIsOffline: () => false }));
jest.mock('@/features/shared/swipeable-row', () => ({ SwipeableRow: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('@/features/notifications/notification-row', () => {
  const { Text, Pressable } = require('react-native');
  return { NotificationRow: ({ item, onRead }: any) => <Pressable onPress={() => onRead(item.id)}><Text>{item.title}</Text></Pressable> };
});
const payload = {
  items: [
    { id: 1, title: '新回复', action: 'reply', createdAt: 1, unread: true, sender: { nickname: '朋友', username: 'friend' } },
    { id: 2, title: '旧回复', action: 'reply', createdAt: 1, unread: false, sender: { nickname: '朋友', username: 'friend' } },
  ], total: 2, unreadCount: 1,
};
let client: QueryClient;
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
  mockRequest.mockReset().mockImplementation(async () => new Response(JSON.stringify(payload)));
  onlineManager.setOnline(true);
});
afterEach(async () => { await cleanup(); client.clear(); onlineManager.setOnline(true); });
function Page({ visible = true }: { visible?: boolean }) {
  return <QueryClientProvider client={client}><ThemeProvider>{visible ? <NotificationsScreen /> : null}</ThemeProvider></QueryClientProvider>;
}
test('filters unread rows and restores all rows', async () => {
  await render(<Page />);
  await screen.findByText('新回复');
  await fireEvent.press(screen.getByText('未读 1'));
  expect(screen.queryByText('旧回复')).toBeNull();
  await fireEvent.press(screen.getByText('全部'));
  expect(screen.getByText('旧回复')).toBeTruthy();
});
test('offline navigation away and back resumes loading when online', async () => {
  onlineManager.setOnline(false);
  const view = await render(<Page />);
  expect(screen.getByText('当前离线')).toBeTruthy();
  expect(mockRequest).not.toHaveBeenCalled();
  await view.rerender(<Page visible={false} />);
  await view.rerender(<Page />);
  expect(screen.getByText('当前离线')).toBeTruthy();
  await act(async () => { onlineManager.setOnline(true); });
  await screen.findByText('新回复');
  expect(screen.queryByText('当前离线')).toBeNull();
});
test('failed mark-read restores unread state and explains the failure', async () => {
  await render(<Page />);
  await screen.findByText('新回复');
  mockRequest.mockResolvedValue(new Response(JSON.stringify({ message: 'failed' }), { status: 400 }));
  await fireEvent.press(screen.getByText('新回复'));
  await screen.findByText('标记已读失败');
  expect(screen.getByText('未读 1')).toBeTruthy();
});
test('failed refresh preserves rows and offers retry', async () => {
  await render(<Page />);
  await screen.findByText('新回复');
  mockRequest.mockResolvedValue(new Response(JSON.stringify({ message: 'failed' }), { status: 400 }));
  await act(async () => { await client.invalidateQueries(); });
  await screen.findByText('当前显示上次保存的内容');
  expect(screen.getByText('新回复')).toBeTruthy();
  mockRequest.mockImplementation(async () => new Response(JSON.stringify(payload)));
  await fireEvent.press(screen.getByLabelText('重新获取最新内容'));
  await waitFor(() => expect(screen.queryByText('当前显示上次保存的内容')).toBeNull());
});
