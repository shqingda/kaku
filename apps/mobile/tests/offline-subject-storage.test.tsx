import { clearOfflineSubjectPack, listOfflineSubjects, removeOfflineSubject, saveOfflineSubject } from '@/features/catalog/offline-subject-pack';
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
test('concurrent saves and removal preserve other subjects; expired entries are hidden', async () => {
  await Promise.all([saveOfflineSubject(subject(1)), saveOfflineSubject(subject(2)), removeOfflineSubject(1)]);
  expect((await listOfflineSubjects()).map(item => item.subject.id)).toEqual([2]);
  mockRaw = JSON.stringify({ items: [{ subject: subject(3), savedAt: 1 }] });
  expect(await listOfflineSubjects()).toEqual([]);
  await clearOfflineSubjectPack();
  expect(mockRaw).toBeNull();
});
test('read failure is visible to management and cannot overwrite existing data', async () => {
  await saveOfflineSubject(subject(1));
  const previous = mockRaw;
  mockFailRead = true;
  await expect(listOfflineSubjects()).rejects.toThrow('storage');
  await expect(saveOfflineSubject(subject(2))).rejects.toThrow('storage');
  expect(mockRaw).toBe(previous);
  mockFailRead = false;
  await removeOfflineSubject(1);
  expect(await listOfflineSubjects()).toEqual([]);
});
