import { act, renderHook } from '@testing-library/react-native';
import { useSyncedHistory } from '@/features/history/use-synced-history';
import { mergeSearchHistory, type SearchHistoryRecord } from '@/features/search/search-history-model';

let mockSession: { user: { id: number } } | null;
let mockEnabled = true;
let mockReady = true;
const mockRequest = jest.fn();
jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => ({ request: mockRequest, session: mockSession, isLoading: false }),
}));
jest.mock('@/features/preferences/preferences-provider', () => ({
  usePreferences: () => ({ preferences: { syncEnabled: mockEnabled }, isReady: mockReady, cloudSyncAvailable: true }),
}));
const empty = { items: [], updatedAt: null };
const options = {
  path: '/me/search-history', errorMessage: '同步失败',
  load: jest.fn<Promise<SearchHistoryRecord>, [number | undefined]>(),
  save: jest.fn<Promise<void>, [SearchHistoryRecord, number | undefined]>(),
  parse: async (value: Response) => value.json(),
  merge: mergeSearchHistory,
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
beforeEach(() => {
  jest.clearAllMocks();
  mockSession = { user: { id: 1 } };
  mockEnabled = true;
  mockReady = true;
  options.load.mockResolvedValue(empty);
  options.save.mockResolvedValue(undefined);
  mockRequest.mockReset().mockResolvedValue(Response.json(empty));
});

test('late account A pull cannot block or overwrite account B', async () => {
  const old = deferred<Response>();
  mockRequest.mockReturnValueOnce(old.promise)
    .mockResolvedValueOnce(Response.json({ items: ['B'], updatedAt: 100 }));
  const hook = await renderHook(() => useSyncedHistory(options));
  const oldSignal = mockRequest.mock.calls[0][1].signal;
  mockSession = { user: { id: 2 } };
  await hook.rerender(undefined);
  expect(hook.result.current.items).toEqual(['B']);
  expect(oldSignal.aborted).toBe(true);
  await act(async () => { old.resolve(Response.json({ items: ['A'], updatedAt: 200 })); });
  expect(hook.result.current.items).toEqual(['B']);
  expect(options.save).toHaveBeenCalledTimes(1);
  expect(options.save).toHaveBeenCalledWith({ items: ['B'], updatedAt: 100 }, 2);
});

test('queued old-account writes are discarded on logout', async () => {
  const hook = await renderHook(() => useSyncedHistory(options));
  const old = deferred<Response>();
  mockRequest.mockReturnValueOnce(old.promise);
  await act(async () => { await hook.result.current.updateItems(() => ['first']); });
  await act(async () => { await hook.result.current.updateItems(() => ['second']); });
  mockSession = null;
  await hook.rerender(undefined);
  await act(async () => { old.resolve(Response.json({ items: ['first'], updatedAt: 100 })); });
  expect(hook.result.current.items).toEqual([]);
  expect(mockRequest).toHaveBeenCalledTimes(2);
  expect(options.load).toHaveBeenLastCalledWith(undefined);
});

test('disabling sync discards queued writes and stale responses', async () => {
  const hook = await renderHook(() => useSyncedHistory(options));
  const old = deferred<Response>();
  mockRequest.mockReturnValueOnce(old.promise);
  await act(async () => { await hook.result.current.updateItems(() => ['first']); });
  await act(async () => { await hook.result.current.updateItems(() => ['latest']); });
  mockEnabled = false;
  await hook.rerender(undefined);
  await act(async () => { old.resolve(Response.json({ items: ['first'], updatedAt: 100 })); });
  expect(hook.result.current.items).toEqual(['latest']);
  expect(mockRequest).toHaveBeenCalledTimes(2);
});

test('history waits for preference hydration and keeps failures retryable', async () => {
  mockReady = false;
  mockRequest.mockReset().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(Response.json(empty));
  const hook = await renderHook(() => useSyncedHistory(options));
  expect(mockRequest).not.toHaveBeenCalled();
  mockReady = true;
  await hook.rerender(undefined);
  expect(hook.result.current.cloudError).toBeTruthy();
  await act(async () => { await hook.result.current.retryCloudSync(); });
  expect(hook.result.current.cloudError).toBeNull();
});

test('local edits during a pull survive and are uploaded after it finishes', async () => {
  const pending = deferred<Response>();
  mockRequest.mockReset().mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce(Response.json({ items: ['latest'], updatedAt: 300 }));
  const hook = await renderHook(() => useSyncedHistory(options));
  await act(async () => { await hook.result.current.updateItems(() => ['latest']); });
  await act(async () => { pending.resolve(Response.json({ items: ['stale'], updatedAt: Date.now() + 1000 })); });
  expect(hook.result.current.items).toEqual(['latest']);
  expect(mockRequest).toHaveBeenLastCalledWith('/me/search-history', expect.objectContaining({
    method: 'PUT', body: JSON.stringify({ items: ['latest'] }),
  }));
});

test('reenabling sync uploads pending local edits instead of accepting a stale cloud snapshot', async () => {
  const hook = await renderHook(() => useSyncedHistory(options));
  mockEnabled = false;
  await hook.rerender(undefined);
  await act(async () => { await hook.result.current.updateItems(() => ['offline-edit']); });
  mockRequest.mockResolvedValueOnce(Response.json({ items: ['offline-edit'], updatedAt: 400 }));
  mockEnabled = true;
  await hook.rerender(undefined);
  expect(mockRequest).toHaveBeenLastCalledWith('/me/search-history', expect.objectContaining({
    method: 'PUT', body: JSON.stringify({ items: ['offline-edit'] }),
  }));
  expect(hook.result.current.items).toEqual(['offline-edit']);
});
