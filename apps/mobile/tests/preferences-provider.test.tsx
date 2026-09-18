import { act, renderHook } from '@testing-library/react-native';
import { PreferencesProvider, usePreferences } from '@/features/preferences/preferences-provider';
import { loadAppPreferences, saveAppPreferences } from '@/features/preferences/app-preferences';
import type { AppPreferences } from '@/features/preferences/preferences-model';

jest.unmock('@/features/preferences/preferences-provider');
const mockRequest = jest.fn();
const mockSession = { user: { id: 1 } };
jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => ({ request: mockRequest, session: mockSession }),
}));
jest.mock('@/features/config/use-public-config', () => ({
  usePublicConfig: () => ({ data: undefined }),
}));
jest.mock('@/features/preferences/app-preferences', () => ({
  loadAppPreferences: jest.fn(), saveAppPreferences: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/infrastructure/kaku/preferences-client', () => ({
  buildPreferencesBody: (theme: string) => JSON.stringify({ theme }),
  parseCloudPreferences: async (value: unknown) => value,
}));
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
const initial: AppPreferences = { theme: 'system', updatedAt: null, syncEnabled: true };
beforeEach(() => {
  jest.clearAllMocks();
  mockRequest.mockReset();
  jest.mocked(loadAppPreferences).mockResolvedValue(initial);
  mockRequest.mockResolvedValueOnce({ theme: 'system', updatedAt: null });
});

test('late PUT cannot restore an old theme or re-enable synchronization', async () => {
  const hook = await renderHook(usePreferences, { wrapper: PreferencesProvider });
  const old = deferred<{ theme: string; updatedAt: number }>();
  mockRequest.mockReturnValueOnce(old.promise);
  await act(() => hook.result.current.setTheme('dark'));
  await act(() => hook.result.current.setTheme('light'));
  await act(() => hook.result.current.setSyncEnabled(false));
  await act(async () => { old.resolve({ theme: 'dark', updatedAt: 100 }); });
  expect(hook.result.current.preferences).toMatchObject({ theme: 'light', syncEnabled: false });
  expect(saveAppPreferences).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'light', syncEnabled: false }));
  expect(mockRequest).toHaveBeenCalledTimes(2);
});

test('waits for the persisted privacy setting before making cloud requests', async () => {
  const local = deferred<AppPreferences>();
  jest.mocked(loadAppPreferences).mockReturnValue(local.promise);
  const hook = await renderHook(usePreferences, { wrapper: PreferencesProvider });
  expect(hook.result.current.isReady).toBe(false);
  expect(mockRequest).not.toHaveBeenCalled();
  await act(async () => { local.resolve({ ...initial, syncEnabled: false }); });
  expect(hook.result.current.isReady).toBe(true);
  expect(mockRequest).not.toHaveBeenCalled();
});

test('serializes writes and leaves the last edit on the server and device', async () => {
  const hook = await renderHook(usePreferences, { wrapper: PreferencesProvider });
  const old = deferred<{ theme: string; updatedAt: number }>();
  mockRequest.mockReturnValueOnce(old.promise).mockResolvedValueOnce({ theme: 'light', updatedAt: 200 });
  await act(() => hook.result.current.setTheme('dark'));
  await act(() => hook.result.current.setTheme('light'));
  expect(mockRequest).toHaveBeenCalledTimes(2);
  await act(async () => { old.resolve({ theme: 'dark', updatedAt: 100 }); });
  expect(mockRequest).toHaveBeenLastCalledWith('/me/preferences', expect.objectContaining({
    method: 'PUT', body: JSON.stringify({ theme: 'light' }),
  }));
  expect(hook.result.current.preferences.theme).toBe('light');
  expect(hook.result.current.syncing).toBe(false);
});

test('an edit during initial pull is preserved and then pushed', async () => {
  const old = deferred<{ theme: string; updatedAt: number }>();
  mockRequest.mockReset().mockReturnValueOnce(old.promise).mockResolvedValueOnce({ theme: 'light', updatedAt: 200 });
  const hook = await renderHook(usePreferences, { wrapper: PreferencesProvider });
  await act(() => hook.result.current.setTheme('light'));
  await act(async () => { old.resolve({ theme: 'dark', updatedAt: Date.now() + 1000 }); });
  expect(hook.result.current.preferences.theme).toBe('light');
  expect(mockRequest).toHaveBeenLastCalledWith('/me/preferences', expect.objectContaining({ method: 'PUT' }));
});
