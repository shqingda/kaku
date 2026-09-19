import type { ReactNode } from 'react';
import { cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { SearchHistoryProvider, useSearchHistory } from '@/features/search/search-history-provider';
import { RecentSubjectsProvider, useRecentSubjects } from '@/features/history/recent-subjects-provider';
import { loadSearchHistory } from '@/features/search/search-history';
import { loadRecentSubjects } from '@/features/history/recent-subjects';

const mockData = new Map<string, string>();
const mockRequest = jest.fn();
let mockUserId = 1;
let mockSync = true;
jest.mock('expo-sqlite/kv-store', () => ({
  getItem: async (key: string) => mockData.get(key) ?? null,
  setItem: async (key: string, value: string) => { mockData.set(key, value); },
}));
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
