import { clearSavedImageFiles, saveImageToLibrary } from '@/features/shared/saved-image-files';
import { recordDiagnosticError } from '@/lib/diagnostic-log';

const mockFiles = new Map<string, { failDelete?: boolean }>();
const mockDownload = jest.fn();
const mockSave = jest.fn();
jest.mock('@/lib/diagnostic-log', () => ({ recordDiagnosticError: jest.fn(async () => {}) }));
jest.mock('expo-media-library', () => ({ Asset: { create: (...args: unknown[]) => mockSave(...args) } }));
jest.mock('expo-file-system', () => {
  class File {
    uri: string;
    name: string;
    constructor(_parent: unknown, name: string) { this.name = name; this.uri = `cache/${name}`; }
    get exists() { return mockFiles.has(this.name); }
    delete() {
      if (mockFiles.get(this.name)?.failDelete) throw new Error('delete failed');
      mockFiles.delete(this.name);
    }
    static async downloadFileAsync(url: string, file: File) {
      mockFiles.set(file.name, {});
      await mockDownload(url, file);
      return file;
    }
  }
  return {
    File,
    Directory: class { list() { return [...mockFiles.keys()].map(name => new File('cache', name)); } },
    Paths: { cache: 'cache' },
  };
});

beforeEach(() => {
  mockFiles.clear();
  mockDownload.mockReset().mockResolvedValue(undefined);
  mockSave.mockReset().mockResolvedValue(undefined);
  jest.mocked(recordDiagnosticError).mockClear();
});

test('saving an image removes its temporary download after the library accepts it', async () => {
  await saveImageToLibrary('https://example.test/a.png');
  expect(mockSave).toHaveBeenCalledWith(expect.stringMatching(/^cache\/kaku-image-.*\.png$/));
  expect(mockFiles.size).toBe(0);
});

test.each(['download', 'library'])('%s failure still removes the partially downloaded file', async (failure) => {
  (failure === 'download' ? mockDownload : mockSave).mockRejectedValueOnce(new Error('failed'));
  await expect(saveImageToLibrary('https://example.test/a.jpg')).rejects.toThrow('failed');
  expect(mockFiles.size).toBe(0);
});

test('cleanup failure does not turn successful library saving into an error', async () => {
  mockDownload.mockImplementation(async (_url, file) => { mockFiles.set(file.name, { failDelete: true }); });
  await expect(saveImageToLibrary('https://example.test/a.webp')).resolves.toBeUndefined();
  expect(recordDiagnosticError).toHaveBeenCalledWith(expect.objectContaining({ message: '图片临时文件未能清理' }));
});

test('manual cleanup removes only owned image files and preserves an active save', async () => {
  let release!: () => void;
  mockSave.mockReturnValueOnce(new Promise<void>(resolve => { release = resolve; }));
  mockFiles.set('kaku-image-123.jpg', {});
  mockFiles.set('unrelated.jpg', {});
  const pending = saveImageToLibrary('https://example.test/a.jpg');
  await Promise.resolve();
  await Promise.resolve();
  await clearSavedImageFiles();
  expect(mockFiles.has('kaku-image-123.jpg')).toBe(false);
  expect(mockFiles.has('unrelated.jpg')).toBe(true);
  expect(mockFiles.size).toBe(2);
  release();
  await pending;
  expect([...mockFiles.keys()]).toEqual(['unrelated.jpg']);
});

test('manual cleanup reports failures so the cache menu can offer retry', async () => {
  mockFiles.set('kaku-image-123.jpg', { failDelete: true });
  await expect(clearSavedImageFiles()).rejects.toThrow('delete failed');
});
