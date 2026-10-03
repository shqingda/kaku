import { renderHook } from '@testing-library/react-native';
import { QueryClient, useQueryClient } from '@tanstack/react-query';

import {
  catalogSubjectQueryOptions,
  prefetchCatalogSubject,
  usePrefetchSubject,
} from '@/features/catalog/use-catalog-subject';
import {
  loadOfflineSubject,
  saveOfflineSubject,
} from '@/features/catalog/offline-subject-pack';
import { getCatalogSubject } from '@/infrastructure/bangumi/catalog/provider';
import { recordDiagnosticError } from '@/lib/diagnostic-log';

jest.mock('@/infrastructure/bangumi/catalog/provider', () => ({
  getCatalogSubject: jest.fn(),
}));
jest.mock('@/features/catalog/offline-subject-pack', () => ({
  loadOfflineSubject: jest.fn(),
  saveOfflineSubject: jest.fn(),
}));
jest.mock('@/lib/diagnostic-log', () => ({
  recordDiagnosticError: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return { ...actual, useQueryClient: jest.fn() };
});

const mockedGetCatalogSubject = jest.mocked(getCatalogSubject);
const mockedLoadOfflineSubject = jest.mocked(loadOfflineSubject);
const mockedSaveOfflineSubject = jest.mocked(saveOfflineSubject);
const mockedRecordDiagnosticError = jest.mocked(recordDiagnosticError);
const mockedUseQueryClient = jest.mocked(useQueryClient);

function runQuery(subjectId: number, signal = new AbortController().signal) {
  const queryFn = catalogSubjectQueryOptions(subjectId).queryFn;
  if (!queryFn) throw new Error('catalog queryFn is missing');
  return queryFn({ signal } as never);
}

describe('catalog subject query', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSaveOfflineSubject.mockResolvedValue(undefined);
  });

  it('disables invalid ids and versions the persisted query key', () => {
    expect(catalogSubjectQueryOptions(0).enabled).toBe(false);
    expect(catalogSubjectQueryOptions(9).queryKey).toEqual([
      'catalog-subject',
      'bangumi',
      4,
      9,
    ]);
  });

  it('returns network data without waiting for the offline write', async () => {
    const subject = { id: 9, name: 'Frieren' } as never;
    mockedGetCatalogSubject.mockResolvedValue(subject);
    mockedSaveOfflineSubject.mockReturnValue(new Promise(() => {}));

    await expect(runQuery(9)).resolves.toBe(subject);
    expect(mockedSaveOfflineSubject).toHaveBeenCalledWith(subject);
  });

  it('falls back to the offline pack after a network failure', async () => {
    const networkError = new Error('offline');
    const packed = { id: 9, name: 'Cached Frieren' } as never;
    mockedGetCatalogSubject.mockRejectedValue(networkError);
    mockedLoadOfflineSubject.mockResolvedValue(packed);

    await expect(runQuery(9)).resolves.toBe(packed);
  });

  it('does not mask an aborted request with cached data', async () => {
    const controller = new AbortController();
    const abortError = new Error('aborted');
    controller.abort();
    mockedGetCatalogSubject.mockRejectedValue(abortError);

    await expect(runQuery(9, controller.signal)).rejects.toBe(abortError);
    expect(mockedLoadOfflineSubject).not.toHaveBeenCalled();
  });

  it('does not recreate offline content when a cancelled query returns after cache clearing', async () => {
    const subject = { id: 9, name: 'Frieren' } as never;
    let resolve!: (value: typeof subject) => void;
    const response = new Promise<typeof subject>((done) => { resolve = done; });
    mockedGetCatalogSubject.mockReturnValueOnce(response);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const options = catalogSubjectQueryOptions(9);
    const pending = client.prefetchQuery(options);

    await client.cancelQueries({ predicate: (query) => query.meta?.persist === true });
    client.removeQueries({ predicate: (query) => query.meta?.persist === true });
    resolve(subject);
    await response;
    await pending;

    expect(mockedSaveOfflineSubject).not.toHaveBeenCalled();
    expect(mockedLoadOfflineSubject).not.toHaveBeenCalled();
    expect(client.getQueryData(options.queryKey)).toBeUndefined();

    // A fresh visit after clearing must still be able to save an offline copy.
    mockedGetCatalogSubject.mockResolvedValueOnce(subject);
    await client.fetchQuery(options);
    expect(mockedSaveOfflineSubject).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(options.queryKey)).toBe(subject);
    client.clear();
  });

  it('does not return an offline copy when cancelled during the storage read', async () => {
    const controller = new AbortController();
    const networkError = new Error('offline');
    const packed = { id: 9, name: 'Cached Frieren' } as never;
    let resolve!: (value: typeof packed) => void;
    mockedGetCatalogSubject.mockRejectedValue(networkError);
    mockedLoadOfflineSubject.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const pending = runQuery(9, controller.signal);
    await Promise.resolve();
    expect(mockedLoadOfflineSubject).toHaveBeenCalledTimes(1);

    controller.abort();
    resolve(packed);

    await expect(pending).rejects.toBe(networkError);
    expect(mockedSaveOfflineSubject).not.toHaveBeenCalled();
  });

  it('records a background offline-write failure without failing the query', async () => {
    const subject = { id: 9, name: 'Frieren' } as never;
    const writeError = new Error('disk full');
    mockedGetCatalogSubject.mockResolvedValue(subject);
    mockedSaveOfflineSubject.mockRejectedValue(writeError);

    await expect(runQuery(9)).resolves.toBe(subject);
    await Promise.resolve();
    expect(mockedRecordDiagnosticError).toHaveBeenCalledWith(writeError);
  });
});

describe('catalog subject prefetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('ignores invalid ids before touching the query client', () => {
    const queryClient = { prefetchQuery: jest.fn() } as never;

    prefetchCatalogSubject(queryClient, 0);

    expect((queryClient as { prefetchQuery: jest.Mock }).prefetchQuery).not.toHaveBeenCalled();
  });

  it('waits 50ms and lets press-out cancel the request', async () => {
    const prefetchQuery = jest.fn();
    mockedUseQueryClient.mockReturnValue({ prefetchQuery } as never);
    const { result, unmount } = await renderHook(() => usePrefetchSubject());

    result.current.prefetch(9);
    jest.advanceTimersByTime(49);
    expect(prefetchQuery).not.toHaveBeenCalled();

    result.current.cancel();
    jest.advanceTimersByTime(1);
    expect(prefetchQuery).not.toHaveBeenCalled();
    await unmount();
  });

  it('prefetches after the hold threshold and cancels pending work on unmount', async () => {
    const prefetchQuery = jest.fn();
    mockedUseQueryClient.mockReturnValue({ prefetchQuery } as never);
    const { result, unmount } = await renderHook(() => usePrefetchSubject());

    result.current.prefetch(9);
    jest.advanceTimersByTime(50);
    expect(prefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['catalog-subject', 'bangumi', 4, 9],
      }),
    );

    result.current.prefetch(10);
    await unmount();
    jest.advanceTimersByTime(50);
    expect(prefetchQuery).toHaveBeenCalledTimes(1);
  });
});
