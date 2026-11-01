import { clearOfflineSubjectPack, loadOfflineSubject, saveOfflineSubject } from '@/features/catalog/offline-subject-pack';
import type { CatalogSubject } from '@/features/catalog/model';
let mockRaw: string | null = null;
let mockFailRead = false;
const mockWrite = jest.fn(async (value: string) => { mockRaw = value; });
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: {
  getItem: async () => { if (mockFailRead) throw new Error('storage'); return mockRaw; },
  setItem: (_key: string, value: string) => mockWrite(value),
  removeItem: async () => { mockRaw = null; },
} }));
const subject = (id: number) => ({ id, title: String(id), episodes: [] } as unknown as CatalogSubject);
beforeEach(() => { mockRaw = null; mockFailRead = false; mockWrite.mockClear(); });
test('concurrent saves preserve both subjects and expired entries are not loaded', async () => {
  await Promise.all([saveOfflineSubject(subject(1)), saveOfflineSubject(subject(2))]);
  expect((await loadOfflineSubject(1))?.id).toBe(1);
  expect((await loadOfflineSubject(2))?.id).toBe(2);
  mockRaw = JSON.stringify({ items: [{ subject: subject(3), savedAt: 1 }] });
  expect(await loadOfflineSubject(3)).toBeNull();
});
test('cache clear stays ordered between saves and does not erase a later save', async () => {
  await Promise.all([saveOfflineSubject(subject(1)), clearOfflineSubjectPack(), saveOfflineSubject(subject(2))]);
  expect(await loadOfflineSubject(1)).toBeNull();
  expect((await loadOfflineSubject(2))?.id).toBe(2);
});
test('failed reads cannot overwrite existing data and the queue recovers', async () => {
  await saveOfflineSubject(subject(1));
  const previous = mockRaw;
  mockFailRead = true;
  expect(await loadOfflineSubject(1)).toBeNull();
  await expect(saveOfflineSubject(subject(2))).rejects.toThrow('storage');
  expect(mockRaw).toBe(previous);
  mockFailRead = false;
  await saveOfflineSubject(subject(2));
  expect((await loadOfflineSubject(1))?.id).toBe(1);
  expect((await loadOfflineSubject(2))?.id).toBe(2);
});
