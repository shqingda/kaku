import { act, renderHook } from '@testing-library/react-native';
import { useSyncedHistory } from '@/features/history/use-synced-history';
import { addRecentSearch, mergeSearchHistory, type SearchHistoryRecord } from '@/features/search/search-history-model';

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
  applyPending: (stored: string[], pending: string[]) => pending.reduceRight((items, item) => addRecentSearch(items, item), stored),
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
  options.load.mockReset().mockResolvedValue(empty);
  options.save.mockReset().mockResolvedValue(undefined);
  mockRequest.mockReset().mockImplementation(async () => Response.json(empty));
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

test('failed local clear is reported before any cloud deletion; retry can persist and sync', async () => {
  const original = { items: ['keep until cleared'], updatedAt: 100 };
  options.load.mockResolvedValueOnce(original);
  mockRequest.mockResolvedValueOnce(Response.json(original));
  const hook = await renderHook(() => useSyncedHistory(options));
  mockRequest.mockClear();
  const error = new Error('disk full');
  options.save.mockRejectedValueOnce(error);

  await act(async () => {
    await expect(hook.result.current.clearHistory()).rejects.toBe(error);
  });
  expect(mockRequest).not.toHaveBeenCalled();
  expect(hook.result.current.items).toEqual(original.items);

  await act(async () => { await hook.result.current.clearHistory(); });
  expect(options.save).toHaveBeenCalledWith(expect.objectContaining({ items: [] }), 1);
  expect(mockRequest).toHaveBeenCalledWith('/me/search-history', expect.objectContaining({
    method: 'PUT', body: JSON.stringify({ items: [] }),
  }));
});

test('cloud retry cannot bypass a local save failure and local retry resumes once storage recovers', async () => {
  const hook = await renderHook(() => useSyncedHistory(options));
  mockRequest.mockClear();
  options.save.mockRejectedValue(new Error('disk full'));
  await act(async () => {
    await expect(hook.result.current.clearHistory()).rejects.toThrow('disk full');
    await hook.result.current.retryCloudSync();
  });
  expect(mockRequest).not.toHaveBeenCalled();
  expect(hook.result.current.localStatus).toBe('write-error');

  options.save.mockResolvedValue(undefined);
  await act(async () => { await hook.result.current.retryLocalHistory(); });
  // Failed clear never becomes a delayed deletion during recovery.
  expect(mockRequest.mock.calls.every(([, init]) => init.method !== 'PUT')).toBe(true);
  expect(hook.result.current.cloudError).toBeNull();
});

test('slow hydration buffers additions and replays them over the stored history once', async () => {
  mockEnabled = false;
  const read = deferred<SearchHistoryRecord>();
  options.load.mockReturnValueOnce(read.promise);
  const hook = await renderHook(() => useSyncedHistory(options));
  expect(hook.result.current.localStatus).toBe('loading');
  await act(async () => {
    await hook.result.current.updateItems(items => addRecentSearch(items, 'A'));
    await hook.result.current.updateItems(items => addRecentSearch(items, 'B'));
  });
  expect(options.save).not.toHaveBeenCalled();
  expect(mockRequest).not.toHaveBeenCalled();
  await act(async () => { read.resolve({ items: ['old', 'A'], updatedAt: 100 }); });
  expect(hook.result.current.items).toEqual(['B', 'A', 'old']);
  expect(hook.result.current.localStatus).toBe('ready');
  expect(options.save).toHaveBeenCalledTimes(1);
});

test('failed reads preserve bounded pending additions, block clearing and deduplicate retries', async () => {
  mockEnabled = false;
  options.load.mockRejectedValueOnce(new Error('disk')).mockRejectedValueOnce(new Error('still disk'));
  const hook = await renderHook(() => useSyncedHistory(options));
  expect(hook.result.current.localStatus).toBe('read-error');
  await act(async () => {
    for (let i = 0; i < 12; i++) await hook.result.current.updateItems(items => addRecentSearch(items, String(i)));
    await expect(hook.result.current.clearHistory()).rejects.toThrow('读取');
    expect(await hook.result.current.retryLocalHistory()).toBe(false);
  });
  expect(hook.result.current.items).toHaveLength(8);
  expect(options.save).not.toHaveBeenCalled();
  expect(mockRequest).not.toHaveBeenCalled();
  const read = deferred<SearchHistoryRecord>();
  options.load.mockReturnValueOnce(read.promise);
  await act(async () => {
    const first = hook.result.current.retryLocalHistory();
    expect(hook.result.current.retryLocalHistory()).toBe(first);
    read.resolve({ items: ['old'], updatedAt: 100 });
    expect(await first).toBe(true);
  });
  expect(options.load).toHaveBeenCalledTimes(3);
  expect(hook.result.current.items).toEqual(['11', '10', '9', '8', '7', '6', '5', '4']);
});

test('failed replay keeps the recovered history and new edits until save retry succeeds', async () => {
  mockEnabled = false;
  const read = deferred<SearchHistoryRecord>();
  options.load.mockReturnValueOnce(read.promise);
  options.save.mockRejectedValueOnce(new Error('full'));
  const hook = await renderHook(() => useSyncedHistory(options));
  await act(async () => {
    await hook.result.current.updateItems(items => addRecentSearch(items, 'new'));
    read.resolve({ items: ['old'], updatedAt: 100 });
  });
  expect(hook.result.current.localStatus).toBe('write-error');
  expect(hook.result.current.items).toEqual(['new', 'old']);
  await act(async () => { expect(await hook.result.current.retryLocalHistory()).toBe(true); });
  expect(options.load).toHaveBeenCalledTimes(1);
  expect(options.save).toHaveBeenLastCalledWith(expect.objectContaining({ items: ['new', 'old'] }), 1);
  expect(hook.result.current.localError).toBeNull();
});

test('account changes discard pending additions and late reads, including A to B to A', async () => {
  mockEnabled = false;
  const old = deferred<SearchHistoryRecord>();
  options.load.mockReturnValueOnce(old.promise)
    .mockResolvedValueOnce({ items: ['B'], updatedAt: 100 })
    .mockResolvedValueOnce({ items: ['fresh A'], updatedAt: 100 });
  const hook = await renderHook(() => useSyncedHistory(options));
  const oldRetry = hook.result.current.retryLocalHistory;
  await act(async () => { await hook.result.current.updateItems(items => addRecentSearch(items, 'temporary A')); });
  mockSession = { user: { id: 2 } };
  await hook.rerender(undefined);
  expect(hook.result.current.items).toEqual(['B']);
  mockSession = { user: { id: 1 } };
  await hook.rerender(undefined);
  await act(async () => { old.resolve({ items: ['stale A'], updatedAt: 999 }); });
  expect(hook.result.current.items).toEqual(['fresh A']);
  expect(await oldRetry()).toBe(false);
  expect(options.save).not.toHaveBeenCalled();
});

test('returning to an account serializes new reads and writes behind its old read', async () => {
  mockEnabled = false;
  const old = deferred<SearchHistoryRecord>();
  options.load.mockReturnValueOnce(old.promise)
    .mockResolvedValueOnce({ items: ['B'], updatedAt: 100 })
    .mockResolvedValueOnce({ items: ['fresh A'], updatedAt: 100 });
  const hook = await renderHook(() => useSyncedHistory(options));
  mockSession = { user: { id: 2 } };
  await hook.rerender(undefined);
  expect(hook.result.current.items).toEqual(['B']);
  mockSession = { user: { id: 1 } };
  await hook.rerender(undefined);
  await act(async () => { await hook.result.current.updateItems(items => addRecentSearch(items, 'new A')); });
  expect(hook.result.current.localStatus).toBe('loading');
  expect(options.load).toHaveBeenCalledTimes(2);
  expect(options.save).not.toHaveBeenCalled();
  await act(async () => { old.resolve({ items: ['stale A'], updatedAt: 999 }); });
  expect(hook.result.current.items).toEqual(['new A', 'fresh A']);
  expect(options.load).toHaveBeenCalledTimes(3);
  expect(options.save).toHaveBeenCalledTimes(1);
  expect(options.save).toHaveBeenCalledWith(expect.objectContaining({ items: ['new A', 'fresh A'] }), 1);
});

test('clear stays visible while saving, coalesces clicks and keeps later additions', async () => {
  mockEnabled = false;
  options.load.mockResolvedValueOnce({ items: ['old'], updatedAt: 100 });
  const hook = await renderHook(() => useSyncedHistory(options));
  const write = deferred<void>();
  options.save.mockReturnValueOnce(write.promise);
  let clearing!: Promise<void>;
  let adding!: Promise<void>;
  await act(async () => {
    clearing = hook.result.current.clearHistory();
    expect(hook.result.current.clearHistory()).toBe(clearing);
    adding = hook.result.current.updateItems(items => addRecentSearch(items, 'after clear'));
  });
  expect(hook.result.current.isClearing).toBe(true);
  expect(hook.result.current.items).toEqual(['old']);
  await act(async () => { write.resolve(); await clearing; await adding; });
  expect(hook.result.current.items).toEqual(['after clear']);
  expect(hook.result.current.isClearing).toBe(false);
  expect(options.save.mock.calls.map(([record]) => record.items)).toEqual([[], ['after clear']]);
});

test('a cloud response arriving while clear is still saving cannot restore deleted history', async () => {
  options.load.mockResolvedValueOnce({ items: ['old'], updatedAt: 100 });
  const cloud = deferred<Response>();
  mockRequest.mockReturnValueOnce(cloud.promise);
  const hook = await renderHook(() => useSyncedHistory(options));
  const write = deferred<void>();
  options.save.mockReturnValueOnce(write.promise);
  let clearing!: Promise<void>;
  await act(async () => { clearing = hook.result.current.clearHistory(); });
  await act(async () => { cloud.resolve(Response.json({ items: ['late'], updatedAt: Date.now() + 1000 })); });
  await act(async () => { write.resolve(); await clearing; });
  expect(hook.result.current.items).toEqual([]);
  expect(options.save.mock.calls.some(([record]) => record.items.includes('late'))).toBe(false);
});

test('late account A save cannot change account B or start an old upload', async () => {
  mockEnabled = false;
  const hook = await renderHook(() => useSyncedHistory(options));
  const write = deferred<void>();
  options.save.mockReturnValueOnce(write.promise);
  let adding!: Promise<void>;
  await act(async () => { adding = hook.result.current.updateItems(() => ['A']); });
  mockSession = { user: { id: 2 } };
  options.load.mockResolvedValueOnce({ items: ['B'], updatedAt: 100 });
  await hook.rerender(undefined);
  expect(hook.result.current.items).toEqual(['B']);
  await act(async () => { write.resolve(); await adding; });
  expect(hook.result.current.items).toEqual(['B']);
  expect(mockRequest).not.toHaveBeenCalled();
});

test('unmount drops pending recovery without writing the buffered records', async () => {
  const read = deferred<SearchHistoryRecord>();
  options.load.mockReturnValueOnce(read.promise);
  const hook = await renderHook(() => useSyncedHistory(options));
  await act(async () => { await hook.result.current.updateItems(() => ['temporary']); });
  await hook.unmount();
  await act(async () => { read.resolve({ items: ['old'], updatedAt: 100 }); });
  expect(options.save).not.toHaveBeenCalled();
  expect(mockRequest).not.toHaveBeenCalled();
});
