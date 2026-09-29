import { act, cleanup, renderHook } from '@testing-library/react-native';
import { useApkDownload } from '@/features/app-update/use-apk-download';
const mockDownload = jest.fn(), mockCancel = jest.fn(), mockInfo = jest.fn(), mockDelete = jest.fn(), mockInstall = jest.fn();
let mockProgress: (event: { totalBytesWritten: number }) => void;
jest.mock('expo', () => ({ requireOptionalNativeModule: () => ({}) }));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  createDownloadResumable: (_url: string, _uri: string, _options: unknown, progress: typeof mockProgress) => { mockProgress = progress; return { downloadAsync: mockDownload, cancelAsync: mockCancel }; },
  getInfoAsync: () => mockInfo(), deleteAsync: () => mockDelete(), getContentUriAsync: async () => 'content://update',
}));
jest.mock('expo-intent-launcher', () => ({ startActivityAsync: (...args: unknown[]) => mockInstall(...args) }));
const release = { version: '1.2.0', notes: '', pageUrl: 'https://github.com/shqingda/kaku', apk: { size: 100, url: 'https://example.test/file.apk' } };
beforeEach(() => { for (const mock of [mockDownload, mockCancel, mockInfo, mockDelete, mockInstall]) mock.mockReset().mockResolvedValue(undefined); });
afterEach(cleanup);
test('shows progress, validates size, and waits for explicit install', async () => {
  let resolve!: (value: unknown) => void;
  mockDownload.mockReturnValue(new Promise(done => { resolve = done; }));
  mockInfo.mockResolvedValue({ exists: true, size: 100 });
  const { result } = await renderHook(useApkDownload);
  let pending!: Promise<void>;
  await act(() => { pending = result.current.download(release); });
  await act(() => mockProgress({ totalBytesWritten: 50 }));
  expect(result.current.progress).toBe(0.5);
  await act(async () => { resolve({ status: 200 }); await pending; });
  expect(result.current.status).toBe('ready');
  expect(mockInstall).not.toHaveBeenCalled();
  await act(() => result.current.install());
  expect(mockInstall).toHaveBeenCalledWith('android.intent.action.VIEW', expect.objectContaining({ flags: 1, data: 'content://update' }));
  expect(result.current.status).toBe('ready');
});
test('partial downloads are removed and never offered for installation', async () => {
  mockDownload.mockResolvedValue({ status: 200 }); mockInfo.mockResolvedValue({ exists: true, size: 99 });
  const { result } = await renderHook(useApkDownload);
  await act(() => result.current.download(release));
  expect(result.current.status).toBe('error');
  expect(mockDelete).toHaveBeenCalled();
  await act(() => result.current.install());
  expect(mockInstall).not.toHaveBeenCalled();
});
test('cancelled download completion cannot become ready', async () => {
  let resolve!: (value: unknown) => void;
  mockDownload.mockReturnValue(new Promise(done => { resolve = done; }));
  const { result } = await renderHook(useApkDownload);
  let pending!: Promise<void>;
  await act(() => { pending = result.current.download(release); });
  await act(() => result.current.cancel());
  await act(async () => { resolve({ status: 200 }); await pending; });
  expect(result.current.status).toBe('idle'); expect(mockDelete).toHaveBeenCalled();
});
