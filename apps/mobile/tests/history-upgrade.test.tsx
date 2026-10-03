import type { ReactNode } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { SearchHistoryProvider, useSearchHistory } from '@/features/search/search-history-provider';
import { RecentSubjectsProvider, useRecentSubjects } from '@/features/history/recent-subjects-provider';
import { loadSearchHistory } from '@/features/search/search-history';
import { loadRecentSubjects } from '@/features/history/recent-subjects';
import { recordDiagnosticError } from '@/lib/diagnostic-log';

const mockData = new Map<string, string>();
const mockRequest = jest.fn();
let mockFailWrite = false;
let mockFailRead = false;
let mockUserId = 1;
let mockSync = true;
jest.mock('expo-sqlite/kv-store', () => ({
  getItem: async (key: string) => {
    if (mockFailRead) throw new Error('storage unavailable');
    return mockData.get(key) ?? null;
  },
  setItem: async (key: string, value: string) => {
    if (mockFailWrite) throw new Error('disk full');
    mockData.set(key, value);
  },
}));
jest.mock('@/lib/diagnostic-log', () => ({ recordDiagnosticError: jest.fn() }));
jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => ({ request: mockRequest, session: { user: { id: mockUserId } }, isLoading: false }),
}));
jest.mock('@/features/preferences/preferences-provider', () => ({
  usePreferences: () => ({ preferences: { syncEnabled: mockSync }, isReady: true, cloudSyncAvailable: true }),
}));
function Providers({ children }: { children: ReactNode }) {
  return <SearchHistoryProvider><RecentSubjectsProvider>{children}</RecentSubjectsProvider></SearchHistoryProvider>;
}
const useHistories = () => ({ search: useSearchHistory(), recent: useRecentSubjects() });
beforeEach(() => {
  mockData.clear();
  mockRequest.mockReset();
  mockUserId = 1;
  mockSync = true;
  mockFailWrite = false;
  mockFailRead = false;
  jest.mocked(recordDiagnosticError).mockReset().mockResolvedValue(undefined);
});

test('both providers recover stored records with bounded temporary additions after a failed read', async () => {
  mockSync = false;
  const searchKey = 'kaku-recent-searches:v2:1';
  const recentKey = 'kaku-recent-subjects:v2:1';
  const originalSearch = JSON.stringify({ items: ['old search'], updatedAt: 100 });
  const originalRecent = JSON.stringify({ items: [{ id: 1, title: 'old subject', type: 2, viewedAt: 100 }], updatedAt: 100 });
  mockData.set(searchKey, originalSearch);
  mockData.set(recentKey, originalRecent);
  mockFailRead = true;
  const hook = await renderHook(useHistories, { wrapper: Providers });
  expect(hook.result.current.search.localStatus).toBe('read-error');
  expect(hook.result.current.recent.localStatus).toBe('read-error');
  await act(async () => {
    hook.result.current.search.addSearch('new search');
    for (let id = 2; id <= 14; id++) hook.result.current.recent.rememberSubject({ id, title: String(id), type: 2, viewedAt: id * 100 });
  });
  expect(hook.result.current.recent.items).toHaveLength(10);
  expect(mockData.get(searchKey)).toBe(originalSearch);
  expect(mockData.get(recentKey)).toBe(originalRecent);
  expect(mockRequest).not.toHaveBeenCalled();
  mockFailRead = false;
  await act(async () => {
    await hook.result.current.search.retryLocalHistory();
    await hook.result.current.recent.retryLocalHistory();
  });
  expect((await loadSearchHistory(1)).items).toEqual(['new search', 'old search']);
  expect((await loadRecentSubjects(1)).items.map(item => item.id)).toEqual([14, 13, 12, 11, 10, 9, 8, 7, 6, 5]);
});

test('automatic history write failures keep current content usable, even if diagnostics cannot save', async () => {
  mockSync = false;
  const hook = await renderHook(useHistories, { wrapper: Providers });
  mockFailWrite = true;
  jest.mocked(recordDiagnosticError).mockRejectedValue(new Error('disk full'));
  const subject = { id: 1, title: 'subject', type: 2, viewedAt: 100 };
  await act(async () => {
    hook.result.current.search.addSearch('new search');
    hook.result.current.recent.rememberSubject(subject);
  });
  expect(hook.result.current.search.items).toEqual(['new search']);
  expect(hook.result.current.recent.items[0]?.id).toBe(1);
  expect(recordDiagnosticError).toHaveBeenCalledTimes(2);
  expect(mockData.size).toBe(0);
  expect(mockRequest).not.toHaveBeenCalled();

  mockFailWrite = false;
  await act(async () => {
    hook.result.current.search.addSearch('retry search');
    hook.result.current.recent.rememberSubject({ ...subject, id: 2 });
  });
  expect((await loadSearchHistory(1)).items).toEqual(['retry search', 'new search']);
  expect((await loadRecentSubjects(1)).items.map(item => item.id)).toEqual([2, 1]);
});
afterEach(async () => { await cleanup(); });

test('upgrade restores both histories from cloud, retains legacy data, and remounts each account locally', async () => {
  const legacySearch = JSON.stringify({ items: ['unowned'], updatedAt: 999 });
  const legacyRecent = JSON.stringify({ items: [{ id: 99, title: 'unowned', type: 2, viewedAt: 999 }], updatedAt: 999 });
  mockData.set('kaku-recent-searches', legacySearch);
  mockData.set('kaku-recent-subjects', legacyRecent);
  mockRequest.mockImplementation(async (path: string) => {
    const owner = mockUserId;
    return Response.json(path === '/me/search-history'
      ? { history: { items: [`account ${owner}`], updatedAt: 100 } }
      : { recentSubjects: { items: [{ id: owner, title: `subject ${owner}`, type: 2, viewedAt: 100 }], updatedAt: 100 } });
  });
  const hook = await renderHook(useHistories, { wrapper: Providers });
  await waitFor(() => expect(hook.result.current.search.items).toEqual(['account 1']));
  await waitFor(() => expect(hook.result.current.recent.items[0]?.id).toBe(1));
  expect((await loadSearchHistory(1)).items).toEqual(['account 1']);
  expect((await loadRecentSubjects(1)).items[0]?.id).toBe(1);
  mockUserId = 2;
  await hook.rerender(undefined);
  await waitFor(() => expect(hook.result.current.search.items).toEqual(['account 2']));
  await waitFor(() => expect(hook.result.current.recent.items[0]?.id).toBe(2));
  expect(mockRequest).toHaveBeenCalledTimes(4);
  expect(mockRequest.mock.calls.every(([, options]) => options.method !== 'PUT')).toBe(true);
  await hook.unmount();
  mockSync = false;
  mockUserId = 1;
  const local = await renderHook(useHistories, { wrapper: Providers });
  await waitFor(() => expect(local.result.current.search.items).toEqual(['account 1']));
  await waitFor(() => expect(local.result.current.recent.items[0]?.id).toBe(1));
  mockUserId = 2;
  await local.rerender(undefined);
  await waitFor(() => expect(local.result.current.search.items).toEqual(['account 2']));
  await waitFor(() => expect(local.result.current.recent.items[0]?.id).toBe(2));
  expect(mockRequest).toHaveBeenCalledTimes(4);
  expect(mockData.get('kaku-recent-searches')).toBe(legacySearch);
  expect(mockData.get('kaku-recent-subjects')).toBe(legacyRecent);
});
