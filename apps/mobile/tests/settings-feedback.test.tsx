import { Linking } from 'react-native';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import SettingsScreen from '@/app/settings';
import { ThemeProvider } from '@/features/theme/theme-provider';
let mockError: string | null = null;
let mockSyncing = false;
let mockSyncEnabled = true;
let mockAvailable = true;
const mockRetry = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/auth/auth-provider', () => ({ useAuth: () => ({ session: { user: { id: 1 } } }) }));
jest.mock('@/features/preferences/preferences-provider', () => ({ usePreferences: () => ({ preferences: { theme: 'system', syncEnabled: mockSyncEnabled }, cloudError: mockError, cloudSyncAvailable: mockAvailable, syncing: mockSyncing, retryCloudSync: mockRetry, setTheme: jest.fn(), setSyncEnabled: jest.fn() }) }));
jest.mock('@/features/history/recent-subjects-provider', () => ({ useRecentSubjects: () => ({ items: [], cloudError: null, syncing: false }) }));
jest.mock('@/features/search/search-history-provider', () => ({ useSearchHistory: () => ({ items: [], cloudError: null, syncing: false }) }));
jest.mock('@/features/push/use-push-registration', () => ({ usePushRegistration: () => ({ enabled: true, status: 'denied', setEnabled: jest.fn() }) }));
beforeEach(() => { mockError = null; mockSyncing = false; mockSyncEnabled = true; mockAvailable = true; mockRetry.mockClear(); });
afterEach(async () => { await cleanup(); jest.restoreAllMocks(); });
test('denied permission opens system settings and an open failure can be retried', async () => {
  const open = jest.spyOn(Linking, 'openSettings').mockRejectedValueOnce(new Error('unavailable')).mockResolvedValue(undefined);
  await render(<ThemeProvider><SettingsScreen /></ThemeProvider>);
  await fireEvent.press(screen.getByText('打开系统设置'));
  expect(screen.getByText(/无法打开系统设置/)).toBeTruthy();
  await fireEvent.press(screen.getByText('打开系统设置'));
  expect(open).toHaveBeenCalledTimes(2);
  expect(screen.queryByText(/无法打开系统设置/)).toBeNull();
});


test('sync failure is visible in text and the affected channel can be retried', async () => {
  mockError = 'offline';
  const view = await render(<ThemeProvider><SettingsScreen /></ThemeProvider>);
  expect(screen.getByText('外观 · 同步失败 · 重试')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('外观，同步失败'));
  expect(mockRetry).toHaveBeenCalledTimes(1);
  mockSyncing = true;
  await view.rerender(<ThemeProvider><SettingsScreen /></ThemeProvider>);
  expect(screen.getByText('外观 · 正在同步')).toBeTruthy();
});

test('disabled or unavailable sync never reports success or an obsolete in-flight state', async () => {
  mockSyncEnabled = false; mockSyncing = true;
  const view = await render(<ThemeProvider><SettingsScreen /></ThemeProvider>);
  expect(screen.getByText('外观 · 未同步')).toBeTruthy();
  expect(screen.queryByText(/已同步/)).toBeNull();
  mockSyncEnabled = true; mockAvailable = false;
  await view.rerender(<ThemeProvider><SettingsScreen /></ThemeProvider>);
  expect(screen.getByText('外观 · 未同步')).toBeTruthy();
  expect(screen.getByText(/云同步暂不可用/)).toBeTruthy();
});
