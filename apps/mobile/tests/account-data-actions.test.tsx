import { Alert } from 'react-native';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AccountSettingsMenu } from '@/features/account/account-settings-menu';
import { ThemeProvider } from '@/features/theme/theme-provider';

const mockCheckUpdate = jest.fn();
let mockCheckingUpdate = false;
jest.mock('@/features/app-update/update-provider', () => ({ useAppUpdate: () => ({ state: { status: mockCheckingUpdate ? 'checking' : 'idle' }, check: mockCheckUpdate }) }));
const mockSearch = jest.fn();
const mockBrowse = jest.fn();
const mockRemoveCache = jest.fn();
const mockOffline = jest.fn();
const mockImageMemory = jest.fn();
const mockImageDisk = jest.fn();
let mockUserId = 1;
let mockSync = true;
jest.mock('@/features/auth/auth-provider', () => ({ useAuth: () => ({ session: { user: { id: mockUserId } } }) }));
jest.mock('@/features/preferences/preferences-provider', () => ({ usePreferences: () => ({ preferences: { theme: 'light', syncEnabled: mockSync }, cloudSyncAvailable: true }) }));
jest.mock('@/features/history/recent-subjects-provider', () => ({ useRecentSubjects: () => ({ clearHistory: mockBrowse }) }));
jest.mock('@/features/search/search-history-provider', () => ({ useSearchHistory: () => ({ clearHistory: mockSearch }) }));
jest.mock('@/features/catalog/offline-subject-pack', () => ({ clearOfflineSubjectPack: () => mockOffline() }));
jest.mock('@/lib/query-persister', () => ({ queryPersister: { removeClient: () => mockRemoveCache() } }));
jest.mock('expo-image', () => ({ Image: { clearMemoryCache: () => mockImageMemory(), clearDiskCache: () => mockImageDisk() } }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/features/shared/app-action-menu', () => {
  const { Button, View } = require('react-native');
  return { AppActionMenu: ({ visible, actions }: any) => visible ? <View>{actions.map((a: any) => <Button key={a.id} title={a.label} onPress={a.onPress} />)}</View> : null };
});
let client: QueryClient;
let alerts: jest.SpyInstance;
function Page() { return <QueryClientProvider client={client}><ThemeProvider><AccountSettingsMenu /></ThemeProvider></QueryClientProvider>; }
function confirm() { return alerts.mock.calls.at(-1)![2].at(-1).onPress(); }
beforeEach(() => {
  mockUserId = 1; mockSync = true; mockCheckUpdate.mockReset(); mockCheckingUpdate = false;
  for (const mock of [mockSearch, mockBrowse, mockRemoveCache, mockOffline, mockImageMemory, mockImageDisk]) mock.mockReset().mockResolvedValue(undefined);
  mockImageDisk.mockResolvedValue(true); mockImageMemory.mockResolvedValue(true);
  client = new QueryClient(); alerts = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(async () => { await cleanup(); client.clear(); alerts.mockRestore(); });

test('cache clearing removes cached queries and images without clearing either history', async () => {
  client.setQueryDefaults(['private'], { meta: { persist: true, private: true } });
  client.setQueryData(['private'], 'cached');
  await render(<Page />);
  await fireEvent.press(screen.getByLabelText('清理缓存'));
  expect(mockRemoveCache).not.toHaveBeenCalled();
  await act(async () => { await confirm(); });
  expect(mockRemoveCache).toHaveBeenCalledTimes(1);
  expect(client.getQueryData(['private'])).toBeUndefined();
  expect(mockOffline).toHaveBeenCalledTimes(1);
  expect(mockSearch).not.toHaveBeenCalled(); expect(mockBrowse).not.toHaveBeenCalled();
  expect(alerts).toHaveBeenLastCalledWith('缓存已清理', expect.stringContaining('草稿'));
});

test.each(['false', 'reject'])('cache failure %s offers a retry', async (mode) => {
  if (mode === 'false') mockImageDisk.mockResolvedValueOnce(false);
  else mockImageDisk.mockRejectedValueOnce(new Error('disk'));
  await render(<Page />);
  await fireEvent.press(screen.getByLabelText('清理缓存'));
  await act(async () => { await confirm(); });
  expect(alerts.mock.calls.at(-1)![0]).toBe('部分缓存未能清理');
  await act(async () => { await confirm(); });
  expect(mockImageDisk).toHaveBeenCalledTimes(2);
  expect(alerts.mock.calls.at(-1)![0]).toBe('缓存已清理');
});

test('history actions are separate, cancellation is inert, and changed account invalidates confirmation', async () => {
  const view = await render(<Page />);
  await fireEvent.press(screen.getByLabelText('管理历史记录'));
  await fireEvent.press(screen.getByText('清除搜索历史'));
  expect(alerts.mock.calls.at(-1)![1]).toContain('其他 Kaku 设备');
  expect(mockSearch).not.toHaveBeenCalled();
  const staleConfirm = alerts.mock.calls.at(-1)![2].at(-1).onPress;
  mockUserId = 2; await view.rerender(<Page />);
  await act(async () => { await staleConfirm(); });
  expect(mockSearch).not.toHaveBeenCalled();
  mockSync = false; await view.rerender(<Page />);
  await fireEvent.press(screen.getByText('清除搜索历史'));
  expect(alerts.mock.calls.at(-1)![1]).toContain('当前只清除本机');
  await act(async () => { await confirm(); });
  expect(mockSearch).toHaveBeenCalledTimes(1); expect(mockBrowse).not.toHaveBeenCalled();
});

test('update row checks directly and shows busy state without navigating', async () => {
  const view = await render(<Page />);
  expect(mockCheckUpdate).toHaveBeenCalledWith(false);
  await fireEvent.press(screen.getByLabelText('检查更新'));
  expect(mockCheckUpdate).toHaveBeenLastCalledWith();
  mockCheckingUpdate = true;
  await view.rerender(<Page />);
  expect(screen.getByLabelText('检查更新').props.accessibilityState.busy).toBe(true);
  expect(screen.getByLabelText('检查更新').props.accessibilityState.disabled).toBe(true);
});

test.each(['search', 'browse'])('failed %s history clear never reports success and can be retried', async (kind) => {
  const clear = kind === 'search' ? mockSearch : mockBrowse;
  const label = kind === 'search' ? '搜索历史' : '浏览历史';
  clear.mockRejectedValueOnce(new Error('disk full'));
  await render(<Page />);
  await fireEvent.press(screen.getByLabelText('管理历史记录'));
  await fireEvent.press(screen.getByText(`清除${label}`));
  await act(async () => { await confirm(); });
  expect(alerts).toHaveBeenLastCalledWith('历史未能保存清除结果', expect.any(String));
  expect(alerts.mock.calls.some(([title]) => title === `${label}已在本机清除`)).toBe(false);

  await fireEvent.press(screen.getByText(`清除${label}`));
  await act(async () => { await confirm(); });
  expect(clear).toHaveBeenCalledTimes(2);
  expect(alerts).toHaveBeenLastCalledWith(`${label}已在本机清除`, expect.any(String));
});
