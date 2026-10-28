import { act, renderHook } from '@testing-library/react-native';
import { PreferencesProvider, usePreferences } from '@/features/preferences/preferences-provider';
import { loadAppPreferences, saveAppPreferences } from '@/features/preferences/app-preferences';
import type { AppPreferences } from '@/features/preferences/preferences-model';
import { useSyncedHistory } from '@/features/history/use-synced-history';
import { mergeSearchHistory } from '@/features/search/search-history-model';
import { Alert } from 'react-native';
import { useClearHistoryAction } from '@/features/history/use-clear-history-action';

jest.unmock('@/features/preferences/preferences-provider');
const mockRequest = jest.fn();
let mockSession = { sessionId: 'first', user: { id: 1 } };
const mockCaptureRequest = () => { const owner = mockSession; return { identity: { userId: owner.user.id, sessionId: owner.sessionId, authEpoch: 0 }, request: mockRequest, isCurrent: () => mockSession === owner }; };
jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => ({ request: mockRequest, captureRequest: mockCaptureRequest, session: mockSession }),
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
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const initial: AppPreferences = { theme: 'system', updatedAt: null, syncEnabled: true };
beforeEach(() => {
  jest.clearAllMocks();
  mockSession = { sessionId: 'first', user: { id: 1 } };
  mockRequest.mockReset();
  jest.mocked(loadAppPreferences).mockReset().mockResolvedValue(initial);
  jest.mocked(saveAppPreferences).mockReset().mockResolvedValue(undefined);
  mockRequest.mockResolvedValueOnce({ theme: 'system', updatedAt: null });
});

test('closing and reopening sync in one batch rebuilds the live cloud scope', async () => {
  const hook = await renderHook(usePreferences, { wrapper: PreferencesProvider });
  mockRequest.mockReset().mockResolvedValue({ theme: 'light', updatedAt: 500 });
  await act(async () => {
    hook.result.current.setSyncEnabled(false);
    hook.result.current.setSyncEnabled(true);
    await hook.result.current.retryLocal();
  });
  expect(hook.result.current.canSync).toBe(true);
  await act(() => hook.result.current.setTheme('light'));
  expect(mockRequest).toHaveBeenLastCalledWith('/me/preferences', expect.objectContaining({
    method: 'PUT', body: JSON.stringify({ theme: 'light' }),
  }));
});

test('a same-batch privacy round trip invalidates history responses and stale clear actions', async () => {
  const empty = { items: [] as string[], updatedAt: null };
  const pending = deferred<Response>();
  let firstHistoryRequest = true;
  mockRequest.mockReset().mockImplementation(async path => {
    if (path === '/me/preferences') return { theme: 'system', updatedAt: null };
    if (firstHistoryRequest) { firstHistoryRequest = false; return pending.promise; }
    return Response.json(empty);
  });
  const options = { path: '/me/search-history', errorMessage: '同步失败',
    load: async () => empty, save: jest.fn(async () => {}),
    parse: async (response: Response) => response.json(), merge: mergeSearchHistory,
    applyPending: (stored: string[], incoming: string[]) => [...incoming, ...stored],
  };
  const alerts = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const clearHistory = jest.fn(async () => {});
  try {
    const hook = await renderHook(() => ({ preferences: usePreferences(), history: useSyncedHistory(options),
      confirm: useClearHistoryAction(),
    }), { wrapper: PreferencesProvider });
    const confirm = hook.result.current.confirm;
    await act(async () => {
      hook.result.current.preferences.setSyncEnabled(false);
      hook.result.current.preferences.setSyncEnabled(true);
      await hook.result.current.preferences.retryLocal();
      pending.resolve(Response.json({ items: ['obsolete'], updatedAt: 500 }));
      await confirm({ clearHistory, localStatus: 'ready', isClearing: false });
    });
    expect(clearHistory).not.toHaveBeenCalled();
    expect(options.save).not.toHaveBeenCalledWith({ items: ['obsolete'], updatedAt: 500 }, 1);
    expect(hook.result.current.history.items).toEqual([]);
  } finally { alerts.mockRestore(); }
});

test('opening sync invalidates a stale local-only clear action before React renders', async () => {
  jest.mocked(loadAppPreferences).mockResolvedValueOnce({ ...initial, syncEnabled: false });
  const alerts = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const clearHistory = jest.fn(async () => {});
  try {
    const hook = await renderHook(() => ({ preferences: usePreferences(), confirm: useClearHistoryAction() }),
      { wrapper: PreferencesProvider });
    const oldConfirm = hook.result.current.confirm;
    await act(async () => {
      hook.result.current.preferences.setSyncEnabled(true);
      await hook.result.current.preferences.retryLocal();
      await oldConfirm({ clearHistory, localStatus: 'ready', isClearing: false });
    });
    expect(clearHistory).not.toHaveBeenCalled();
    expect(alerts).not.toHaveBeenCalled();
  } finally { alerts.mockRestore(); }
});

test.each(['saved', 'failed'] as const)('cloud retry waits for the edited local revision to be %s', async result => {
  const hook = await renderHook(usePreferences, { wrapper: PreferencesProvider });
  mockRequest.mockReset().mockRejectedValueOnce(new Error('offline'));
  await act(async () => { await hook.result.current.retryCloudSync(); });
  expect(hook.result.current.cloudError).toBeTruthy();
  mockRequest.mockReset().mockResolvedValue({ theme: 'dark', updatedAt: 500 });
  const saved = deferred<void>();
  jest.mocked(saveAppPreferences).mockReturnValueOnce(saved.promise);
  await act(() => hook.result.current.setTheme('dark'));
  let retry!: Promise<void>;
  await act(async () => { retry = hook.result.current.retryCloudSync(); });
  const requestsBeforeSave = mockRequest.mock.calls.length;
  await act(async () => {
    if (result === 'saved') saved.resolve();
    else saved.reject(new Error('disk full'));
    await retry;
  });
  expect(requestsBeforeSave).toBe(0);
  const uploads = mockRequest.mock.calls.filter(([, options]) => options?.method === 'PUT');
  expect(uploads).toHaveLength(result === 'saved' ? 1 : 0);
  expect(hook.result.current.localStatus).toBe(result === 'saved' ? 'ready' : 'write-error');
});

test('a failed local read blocks cloud sync and recovery merges only edits made in this window', async () => {
  jest.mocked(loadAppPreferences).mockRejectedValueOnce(new Error('disk read'));
  const hook = await renderHook(usePreferences, { wrapper: PreferencesProvider });
  expect(hook.result.current.localStatus).toBe('read-error');
  expect(hook.result.current.canSync).toBe(false);
  expect(hook.result.current.cloudError).toBeNull();
  expect(mockRequest).not.toHaveBeenCalled();
  await act(() => hook.result.current.setTheme('light'));
  expect(saveAppPreferences).not.toHaveBeenCalled();
  jest.mocked(loadAppPreferences).mockResolvedValueOnce({ theme: 'dark', updatedAt: 5, syncEnabled: false });
  await act(async () => { await hook.result.current.retryLocal(); });
  expect(hook.result.current.preferences).toMatchObject({ theme: 'light', syncEnabled: false });
  expect(saveAppPreferences).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'light', syncEnabled: false }));
  expect(hook.result.current.localStatus).toBe('ready');
  expect(mockRequest).not.toHaveBeenCalled();
});

test('closing sync stops an in-flight request even when saving fails, and retry saves the latest edit', async () => {
  const hook = await renderHook(usePreferences, { wrapper: PreferencesProvider });
  const pending = deferred<{ theme: string; updatedAt: number }>();
  mockRequest.mockReturnValueOnce(pending.promise);
  await act(() => hook.result.current.setTheme('dark'));
  const signal = mockRequest.mock.calls.at(-1)![1].signal;
  jest.mocked(saveAppPreferences).mockRejectedValueOnce(new Error('disk full'));
  await act(() => hook.result.current.setSyncEnabled(false));
  expect(signal.aborted).toBe(true);
  expect(hook.result.current.localStatus).toBe('write-error');
  expect(hook.result.current.canSync).toBe(false);
  expect(hook.result.current.cloudError).toBeNull();
  await act(async () => { pending.resolve({ theme: 'system', updatedAt: 100 }); });
  await act(async () => { await hook.result.current.retryLocal(); });
  expect(hook.result.current.preferences).toMatchObject({ theme: 'dark', syncEnabled: false });
  expect(saveAppPreferences).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'dark', syncEnabled: false }));
});

test('opening sync cannot send before its privacy choice is durably saved', async () => {
  jest.mocked(loadAppPreferences).mockResolvedValueOnce({ ...initial, syncEnabled: false });
  const hook = await renderHook(usePreferences, { wrapper: PreferencesProvider });
  const saved = deferred<void>();
  jest.mocked(saveAppPreferences).mockReturnValueOnce(saved.promise);
  await act(() => hook.result.current.setSyncEnabled(true));
  expect(hook.result.current.canSync).toBe(false);
  expect(mockRequest).not.toHaveBeenCalled();
  await act(async () => { saved.resolve(); });
  expect(hook.result.current.canSync).toBe(true);
  expect(mockRequest).toHaveBeenCalledTimes(1);
});

test('a failed opening save remains local until an explicit recovery succeeds', async () => {
  jest.mocked(loadAppPreferences).mockResolvedValueOnce({ ...initial, syncEnabled: false });
  const hook = await renderHook(usePreferences, { wrapper: PreferencesProvider });
  jest.mocked(saveAppPreferences).mockRejectedValueOnce(new Error('disk full'));
  await act(() => hook.result.current.setSyncEnabled(true));
  await act(async () => { await hook.result.current.retryCloudSync(); });
  expect(hook.result.current.canSync).toBe(false);
  expect(hook.result.current.localStatus).toBe('write-error');
  expect(mockRequest).not.toHaveBeenCalled();
  await act(async () => { await hook.result.current.retryLocal(); });
  expect(hook.result.current.canSync).toBe(true);
  expect(mockRequest).toHaveBeenCalledTimes(1);
});

test('the real preference gate protects both history channels, including a same-turn pending write', async () => {
  const empty = { items: [] as string[], updatedAt: null };
  const historyOptions = (path: string) => ({ path, errorMessage: '同步失败',
    load: async () => empty, save: jest.fn(async () => {}),
    parse: async (response: Response) => response.json(), merge: mergeSearchHistory,
    applyPending: (stored: string[], pending: string[]) => [...pending, ...stored],
  });
  const search = historyOptions('/me/search-history');
  const browse = historyOptions('/me/recent-subjects');
  mockRequest.mockReset().mockImplementation(async path => path === '/me/preferences'
    ? { theme: 'system', updatedAt: null } : Response.json(empty));
  jest.mocked(loadAppPreferences).mockRejectedValueOnce(new Error('unreadable preferences'));
  const hook = await renderHook(() => ({ preferences: usePreferences(),
    search: useSyncedHistory(search), browse: useSyncedHistory(browse),
  }), { wrapper: PreferencesProvider });
  await act(async () => {
    await hook.result.current.search.retryCloudSync();
    await hook.result.current.browse.retryCloudSync();
  });
  expect(mockRequest).not.toHaveBeenCalled();
  await act(async () => { await hook.result.current.preferences.retryLocal(); });
  expect(mockRequest.mock.calls.map(([path]) => path).sort()).toEqual([
    '/me/preferences', '/me/recent-subjects', '/me/search-history',
  ]);
  mockRequest.mockClear();
  const saved = deferred<void>();
  search.save.mockReturnValueOnce(saved.promise);
  await act(async () => {
    const editing = hook.result.current.search.updateItems(() => ['keep locally']);
    hook.result.current.preferences.setSyncEnabled(false);
    saved.resolve();
    await editing;
  });
  expect(mockRequest).not.toHaveBeenCalled();
  expect(hook.result.current.search.items).toEqual(['keep locally']);
});

test('edits during a recovery read and a recovery save win over the old retry snapshot', async () => {
  jest.mocked(loadAppPreferences).mockRejectedValueOnce(new Error('disk read'));
  const hook = await renderHook(usePreferences, { wrapper: PreferencesProvider });
  const loaded = deferred<AppPreferences>();
  jest.mocked(loadAppPreferences).mockReturnValueOnce(loaded.promise);
  let recovery!: Promise<boolean>;
  await act(async () => { recovery = hook.result.current.retryLocal(); });
  await act(() => hook.result.current.setTheme('dark'));
  const saved = deferred<void>();
  jest.mocked(saveAppPreferences).mockReturnValueOnce(saved.promise);
  await act(async () => { loaded.resolve({ ...initial, syncEnabled: false }); });
  await act(() => hook.result.current.setTheme('light'));
  await act(async () => { saved.resolve(); await recovery; });
  expect(hook.result.current.preferences).toMatchObject({ theme: 'light', syncEnabled: false });
  expect(saveAppPreferences).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'light', syncEnabled: false }));
  expect(hook.result.current.localStatus).toBe('ready');
  expect(mockRequest).not.toHaveBeenCalled();
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


test('queued preferences stop immediately when a same-account login replaces their owner', async () => {
  const old = deferred<{ theme: string; updatedAt: number }>();
  mockRequest.mockReset().mockReturnValueOnce(old.promise).mockResolvedValue({ theme: 'dark', updatedAt: 200 });
  const hook = await renderHook(usePreferences, { wrapper: PreferencesProvider });
  await act(() => hook.result.current.setTheme('light'));
  mockSession = { sessionId: 'replacement', user: { id: 1 } };
  await act(async () => { old.resolve({ theme: 'dark', updatedAt: 100 }); });
  expect(mockRequest).toHaveBeenCalledTimes(1);
  expect(hook.result.current.preferences.theme).toBe('light');
});
