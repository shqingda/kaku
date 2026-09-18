import Storage from 'expo-sqlite/kv-store';
import { loadSearchHistory, saveSearchHistory } from '@/features/search/search-history';
import { loadRecentSubjects, saveRecentSubjects } from '@/features/history/recent-subjects';

const mockData = new Map<string, string>();
jest.mock('expo-sqlite/kv-store', () => ({
  getItem: jest.fn(async (key: string) => mockData.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => { mockData.set(key, value); }),
}));
beforeEach(() => mockData.clear());

test('search histories are separate for two accounts and the signed-out device', async () => {
  const a = { items: ['A'], updatedAt: 100 };
  const b = { items: ['B'], updatedAt: 200 };
  const guest = { items: ['guest'], updatedAt: 300 };
  await saveSearchHistory(a, 1);
  await saveSearchHistory(b, 2);
  await saveSearchHistory(guest);
  expect(await loadSearchHistory(1)).toEqual(a);
  expect(await loadSearchHistory(2)).toEqual(b);
  expect(await loadSearchHistory()).toEqual(guest);
});

test('recent subjects are restored only for their owner', async () => {
  const a = { items: [{ id: 1, title: 'A', type: 2, viewedAt: 100 }], updatedAt: 100 };
  await saveRecentSubjects(a, 1);
  expect(await loadRecentSubjects(1)).toEqual(a);
  expect(await loadRecentSubjects(2)).toEqual({ items: [], updatedAt: null });
  expect(await loadRecentSubjects()).toEqual({ items: [], updatedAt: null });
});

test('unowned legacy history is retained but never uploaded as another account', async () => {
  await Storage.setItem('kaku-recent-searches', JSON.stringify({ items: ['legacy'], updatedAt: 100 }));
  expect(await loadSearchHistory(1)).toEqual({ items: [], updatedAt: null });
  expect(await Storage.getItem('kaku-recent-searches')).toContain('legacy');
});
