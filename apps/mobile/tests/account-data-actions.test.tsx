import { router } from 'expo-router';
import { Alert } from 'react-native';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AccountSettingsMenu } from '@/features/account/account-settings-menu';
import { ThemeProvider } from '@/features/theme/theme-provider';

const mockCheckUpdate = jest.fn();
const mockClearApkCache = jest.fn();
let mockCheckingUpdate = false;
jest.mock('@/features/app-update/update-provider', () => ({ useAppUpdate: () => ({ state: { status: mockCheckingUpdate ? 'checking' : 'idle' }, check: mockCheckUpdate, clearApkCache: mockClearApkCache }) }));
const mockSearch = jest.fn();
const mockBrowse = jest.fn();
const mockRemoveCache = jest.fn();
const mockOffline = jest.fn();
const mockImageMemory = jest.fn();
const mockImageDisk = jest.fn();
const mockSavedImages = jest.fn();
let mockUserId = 1;
let mockSync = true;
const mockCanSyncNow = () => mockSync;
const mockIsCurrentSyncScope = () => true;
jest.mock('@/features/auth/auth-provider', () => ({ useAuth: () => ({ session: { user: { id: mockUserId } } }) }));
jest.mock('@/features/preferences/preferences-provider', () => ({ usePreferences: () => ({ preferences: { theme: 'light', syncEnabled: mockSync }, cloudSyncAvailable: true, canSync: mockSync, canSyncNow: mockCanSyncNow, isCurrentSyncScope: mockIsCurrentSyncScope }) }));
jest.mock('@/features/history/recent-subjects-provider', () => ({ useRecentSubjects: () => ({ clearHistory: mockBrowse, localStatus: 'ready', isClearing: false }) }));
jest.mock('@/features/search/search-history-provider', () => ({ useSearchHistory: () => ({ clearHistory: mockSearch, localStatus: 'ready', isClearing: false }) }));
jest.mock('@/features/catalog/offline-subject-pack', () => ({ clearOfflineSubjectPack: () => mockOffline() }));
jest.mock('@/features/shared/saved-image-files', () => ({ clearSavedImageFiles: () => mockSavedImages() }));
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
beforeEach(() => {
  mockUserId = 1; mockSync = true; mockCheckUpdate.mockReset(); mockCheckingUpdate = false;
  mockClearApkCache.mockReset().mockResolvedValue(true);
  for (const mock of [mockSearch, mockBrowse, mockRemoveCache, mockOffline, mockImageMemory, mockImageDisk, mockSavedImages]) mock.mockReset().mockResolvedValue(undefined);
  mockImageDisk.mockResolvedValue(true); mockImageMemory.mockResolvedValue(true);
  client = new QueryClient(); alerts = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(async () => { await cleanup(); client.clear(); alerts.mockRestore(); });

test('cache clearing removes cached queries and images without clearing either history', async () => {
  client.setQueryDefaults(['private'], { meta: { persist: true, private: true } });
  client.setQueryData(['private'], 'cached');
  await render(<Page />);
  await fireEvent.press(screen.getByLabelText('清理缓存'));
  expect(mockRemoveCache).toHaveBeenCalledTimes(1);
  expect(client.getQueryData(['private'])).toBeUndefined();
  expect(mockOffline).toHaveBeenCalledTimes(1);
  expect(mockSavedImages).toHaveBeenCalledTimes(1);
  expect(mockClearApkCache).toHaveBeenCalledTimes(1);
  expect(mockSearch).not.toHaveBeenCalled(); expect(mockBrowse).not.toHaveBeenCalled();
  expect(alerts).not.toHaveBeenCalled();
});

test.each(['false', 'reject'])('cache failure %s offers a retry', async (mode) => {
  if (mode === 'false') mockImageDisk.mockResolvedValueOnce(false);
  else mockImageDisk.mockRejectedValueOnce(new Error('disk'));
  await render(<Page />);
  await fireEvent.press(screen.getByLabelText('清理缓存'));
  expect(screen.getByText('部分缓存未能清理，点击重试')).toBeTruthy();
  expect(alerts).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('清理缓存'));
  expect(mockImageDisk).toHaveBeenCalledTimes(2);
  expect(screen.queryByText('部分缓存未能清理，点击重试')).toBeNull();
  expect(alerts).not.toHaveBeenCalled();
});

test('an APK currently in use makes cache clearing partial and can be retried later', async () => {
  mockClearApkCache.mockResolvedValueOnce(false);
  await render(<Page />);
  await fireEvent.press(screen.getByLabelText('清理缓存'));
  expect(screen.getByText('部分缓存未能清理，点击重试')).toBeTruthy();
  expect(alerts).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('清理缓存'));

  expect(mockClearApkCache).toHaveBeenCalledTimes(2);
  expect(screen.queryByText('部分缓存未能清理，点击重试')).toBeNull();
  expect(alerts).not.toHaveBeenCalled();
});

test('settings no longer duplicates overview history actions', async () => {
  await render(<Page />);
  expect(screen.queryByLabelText('管理历史记录')).toBeNull();
  expect(screen.queryByText('清除搜索历史')).toBeNull();
  expect(screen.queryByText('清除浏览历史')).toBeNull();
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

test('consumer settings omit offline and diagnostic management screens', async () => {
  await render(<Page />);
  expect(screen.queryByText('离线内容')).toBeNull();
  expect(screen.queryByText('诊断信息')).toBeNull();
});


test('cache feedback stays busy, prevents duplicate clearing, then resets after success', async () => {
  jest.useFakeTimers();
  try {
    let finish!: () => void;
    mockImageDisk.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    await render(<Page />);
    expect(screen.getByLabelText('清理缓存').props.accessibilityValue?.text).toBeUndefined();
    await fireEvent.press(screen.getByLabelText('清理缓存'));
    expect(screen.getByLabelText('清理缓存').props.accessibilityValue.text).toBe('正在清理');
    expect(screen.getByLabelText('清理缓存').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByLabelText('清理缓存'));
    expect(mockImageDisk).toHaveBeenCalledTimes(1);
    await act(async () => { finish(); });
    expect(screen.getByLabelText('清理缓存').props.accessibilityValue.text).toBe('清理成功');
    expect(screen.getByText('缓存已清理，历史和草稿已保留')).toBeTruthy();
    await act(async () => { jest.advanceTimersByTime(2400); });
    expect(screen.getByLabelText('清理缓存').props.accessibilityValue?.text).toBeUndefined();
  } finally {
    jest.useRealTimers();
  }
});

test('about is available with general settings and has no duplicate changelog entry', async () => {
  await render(<Page />);
  expect(screen.getByText('设置')).toBeTruthy();
  expect(screen.getByText('关于')).toBeTruthy();
  expect(screen.getByLabelText('关于 Kaku')).toBeTruthy();
  expect(screen.queryByLabelText('更新日志')).toBeNull();
});


test('device management opens its own page from settings', async () => {
  await render(<Page />);
  await fireEvent.press(screen.getByLabelText('登录设备'));
  expect(router.push).toHaveBeenCalledWith('/devices');
});
