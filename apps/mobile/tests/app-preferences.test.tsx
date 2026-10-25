import Storage from 'expo-sqlite/kv-store';
import { loadAppPreferences, saveAppPreferences } from '@/features/preferences/app-preferences';
import { DEFAULT_APP_PREFERENCES } from '@/features/preferences/preferences-model';

const mockData = new Map<string, string>();
jest.mock('expo-sqlite/kv-store', () => ({
  getItem: jest.fn(async (key: string) => mockData.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => { mockData.set(key, value); }),
}));
beforeEach(() => { mockData.clear(); jest.clearAllMocks(); });

test('only a missing preference record uses defaults; valid old records remain compatible', async () => {
  expect(await loadAppPreferences()).toEqual(DEFAULT_APP_PREFERENCES);
  mockData.set('kaku-app-preferences', JSON.stringify({ theme: 'dark' }));
  expect(await loadAppPreferences()).toEqual({ ...DEFAULT_APP_PREFERENCES, theme: 'dark' });
});

test.each(['', '{broken', 'null', '42', '[]', '{}', '{"theme":"neon"}',
  '{"theme":"dark","syncEnabled":"false"}', '{"theme":"dark","updatedAt":-1}',
])('unreadable preference record %s is preserved and reported', async raw => {
  mockData.set('kaku-app-preferences', raw);
  await expect(loadAppPreferences()).rejects.toThrow();
  expect(mockData.get('kaku-app-preferences')).toBe(raw);
  expect(Storage.setItem).not.toHaveBeenCalled();
});

test('storage failures reach the caller instead of reporting a successful save', async () => {
  jest.mocked(Storage.getItem).mockRejectedValueOnce(new Error('read failure'));
  await expect(loadAppPreferences()).rejects.toThrow('read failure');
  jest.mocked(Storage.setItem).mockRejectedValueOnce(new Error('disk full'));
  await expect(saveAppPreferences({ ...DEFAULT_APP_PREFERENCES, syncEnabled: false })).rejects.toThrow('disk full');
});
