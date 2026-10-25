import { act, cleanup, renderHook } from '@testing-library/react-native';
import { useApkDownload } from '@/features/app-update/use-apk-download';
const mockDownload = jest.fn(), mockCancel = jest.fn(), mockInfo = jest.fn(), mockDelete = jest.fn(), mockInstall = jest.fn();
const mockRecords = new Map<string, string>();
const mockRecordError = jest.fn();
const mockWriteRecord = jest.fn((key: string, value: string) => mockRecords.set(key, value));
const APK_RECORD_KEY = 'kaku:update-apk:v1';
let mockProgress: (event: { totalBytesWritten: number }) => void;
jest.mock('expo', () => ({ requireOptionalNativeModule: () => ({}) }));
jest.mock('expo-sqlite/kv-store', () => ({
  getItemSync: (key: string) => mockRecords.get(key) ?? null,
  setItemSync: (key: string, value: string) => mockWriteRecord(key, value),
  removeItemSync: (key: string) => mockRecords.delete(key),
}));
jest.mock('@/lib/diagnostic-log', () => ({ recordDiagnosticError: (...args: unknown[]) => mockRecordError(...args) }));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  createDownloadResumable: (_url: string, _uri: string, _options: unknown, progress: typeof mockProgress) => { mockProgress = progress; return { downloadAsync: mockDownload, cancelAsync: mockCancel }; },
  getInfoAsync: (...args: unknown[]) => mockInfo(...args), deleteAsync: (...args: unknown[]) => mockDelete(...args), getContentUriAsync: async () => 'content://update',
}));
jest.mock('expo-intent-launcher', () => ({ startActivityAsync: (...args: unknown[]) => mockInstall(...args) }));
const release = { version: '1.2.0', notes: '', pageUrl: 'https://github.com/shqingda/kaku', apk: { size: 100, url: 'https://example.test/file.apk' } };
beforeEach(() => {
  for (const mock of [mockDownload, mockCancel, mockInfo, mockDelete, mockInstall, mockRecordError]) mock.mockReset().mockResolvedValue(undefined);
  mockRecords.clear();
  mockWriteRecord.mockReset().mockImplementation((key, value) => mockRecords.set(key, value));
});
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
  expect(JSON.parse(mockRecords.get(APK_RECORD_KEY)!)).toEqual({ version: '1.2.0', size: 100 });
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

test.each(['1.2.0', '1.3.0'])('removes the recorded APK at startup after installation of %s', async (installed) => {
  mockRecords.set(APK_RECORD_KEY, JSON.stringify({ version: '1.2.0', size: 100 }));
  mockInfo.mockResolvedValue({ exists: true, size: 100 });

  await renderHook(() => useApkDownload(installed));

  expect(mockDelete).toHaveBeenCalledWith('file:///cache/kaku-update.apk', { idempotent: true });
  expect(mockRecords.has(APK_RECORD_KEY)).toBe(false);
});

test.each([
  { version: '1.3.0', size: 100 },
  { version: 'invalid', size: 100 },
  { version: '1.2.0', size: -1 },
  null,
])('preserves uninstalled or unrecognized cached APK metadata: %p', async (record) => {
  if (record) mockRecords.set(APK_RECORD_KEY, JSON.stringify(record));
  mockInfo.mockResolvedValue({ exists: true, size: 100 });

  await renderHook(() => useApkDownload('1.2.0'));

  expect(mockDelete).not.toHaveBeenCalled();
});

test('preserves a cached file whose size no longer matches the installation record', async () => {
  mockRecords.set(APK_RECORD_KEY, JSON.stringify({ version: '1.2.0', size: 100 }));
  mockInfo.mockResolvedValue({ exists: true, size: 200 });

  await renderHook(() => useApkDownload('1.2.0'));

  expect(mockDelete).not.toHaveBeenCalled();
});

test('manual cache clearing removes legacy APKs and prevents installing a removed ready download', async () => {
  mockDownload.mockResolvedValue({ status: 200 });
  mockInfo.mockResolvedValue({ exists: true, size: 100 });
  const { result } = await renderHook(useApkDownload);
  await act(() => result.current.download(release));
  mockRecords.delete(APK_RECORD_KEY);

  await act(async () => { expect(await result.current.clearCache()).toBe(true); });
  await act(() => result.current.install());

  expect(mockDelete).toHaveBeenCalledWith('file:///cache/kaku-update.apk', { idempotent: true });
  expect(result.current.status).toBe('idle');
  expect(mockInstall).not.toHaveBeenCalled();
});

test('cache clearing skips an active download and can be retried after it completes', async () => {
  let finish!: (value: unknown) => void;
  mockDownload.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  mockInfo.mockResolvedValue({ exists: true, size: 100 });
  const { result } = await renderHook(useApkDownload);
  let download!: Promise<void>;
  await act(() => { download = result.current.download(release); });

  await act(async () => { expect(await result.current.clearCache()).toBe(false); });
  expect(mockDelete).not.toHaveBeenCalled();
  await act(async () => { finish({ status: 200 }); await download; });
  await act(async () => { expect(await result.current.clearCache()).toBe(true); });
  expect(mockDelete).toHaveBeenCalledTimes(1);
});

test('an open installer owns the APK, and returning without updating keeps install retry available', async () => {
  mockDownload.mockResolvedValue({ status: 200 });
  mockInfo.mockResolvedValue({ exists: true, size: 100 });
  const { result } = await renderHook(useApkDownload);
  await act(() => result.current.download(release));
  let finishInstall!: () => void;
  mockInstall.mockReturnValue(new Promise<void>(resolve => { finishInstall = resolve; }));
  let install!: Promise<void>;
  await act(() => { install = result.current.install(); });

  await act(async () => { expect(await result.current.clearCache()).toBe(false); });
  await act(() => result.current.download({ ...release, version: '1.3.0' }));
  expect(mockDownload).toHaveBeenCalledTimes(1);
  expect(mockDelete).not.toHaveBeenCalled();
  await act(async () => { finishInstall(); await install; });
  expect(result.current.status).toBe('ready');
  expect(mockRecords.has(APK_RECORD_KEY)).toBe(true);
  mockInstall.mockResolvedValue(undefined);
  await act(() => result.current.install());
  expect(mockInstall).toHaveBeenCalledTimes(2);
});

test('an unfinished cleanup blocks replacement downloads across hook instances', async () => {
  const first = await renderHook(useApkDownload);
  let finishDelete!: () => void;
  mockDelete.mockReturnValueOnce(new Promise<void>(resolve => { finishDelete = resolve; }));
  let clear!: Promise<boolean>;
  await act(() => { clear = first.result.current.clearCache(); });
  const second = await renderHook(useApkDownload);

  await act(() => second.result.current.download(release));
  expect(mockDownload).not.toHaveBeenCalled();
  expect(second.result.current.status).toBe('error');
  await act(async () => { finishDelete(); await clear; });
  mockDownload.mockResolvedValue({ status: 200 });
  mockInfo.mockResolvedValue({ exists: true, size: 100 });
  await act(() => second.result.current.download(release));
  expect(second.result.current.status).toBe('ready');
});

test('metadata write failures remove the incomplete operation instead of keeping stale metadata', async () => {
  mockRecords.set(APK_RECORD_KEY, JSON.stringify({ version: '1.1.0', size: 90 }));
  mockDownload.mockResolvedValue({ status: 200 });
  mockInfo.mockResolvedValue({ exists: true, size: 100 });
  mockWriteRecord.mockImplementationOnce(() => { throw new Error('disk full'); });
  const { result } = await renderHook(useApkDownload);

  await act(() => result.current.download(release));

  expect(result.current.status).toBe('error');
  expect(mockRecords.has(APK_RECORD_KEY)).toBe(false);
  expect(mockDelete).toHaveBeenCalledTimes(1);
});

test('cancellation cleanup keeps ownership after unmount until the old download settles', async () => {
  let finishDownload!: (value: unknown) => void;
  mockDownload.mockReturnValueOnce(new Promise(resolve => { finishDownload = resolve; }));
  const first = await renderHook(useApkDownload);
  let oldDownload!: Promise<void>;
  await act(() => { oldDownload = first.result.current.download(release); });
  await first.unmount();
  const second = await renderHook(useApkDownload);
  await act(() => second.result.current.download(release));
  expect(mockDownload).toHaveBeenCalledTimes(1);
  expect(second.result.current.status).toBe('error');

  await act(async () => { finishDownload({ status: 200 }); await oldDownload; });
  mockDownload.mockResolvedValue({ status: 200 });
  mockInfo.mockResolvedValue({ exists: true, size: 100 });
  await act(() => second.result.current.download(release));

  expect(second.result.current.status).toBe('ready');
  expect(mockDelete).toHaveBeenCalledTimes(1);
  expect(mockRecords.has(APK_RECORD_KEY)).toBe(true);
});

test('startup cleanup failures are recorded and release ownership for manual retry', async () => {
  mockRecords.set(APK_RECORD_KEY, JSON.stringify({ version: '1.2.0', size: 100 }));
  mockInfo.mockResolvedValue({ exists: true, size: 100 });
  mockDelete.mockRejectedValueOnce(new Error('busy storage'));
  const { result } = await renderHook(() => useApkDownload('1.2.0'));

  expect(mockRecordError).toHaveBeenCalledTimes(1);
  expect(mockRecords.has(APK_RECORD_KEY)).toBe(true);
  await act(async () => { expect(await result.current.clearCache()).toBe(true); });
  expect(mockRecords.has(APK_RECORD_KEY)).toBe(false);
});

test('installation rejects a ready file whose version record changed', async () => {
  mockDownload.mockResolvedValue({ status: 200 });
  mockInfo.mockResolvedValue({ exists: true, size: 100 });
  const { result } = await renderHook(useApkDownload);
  await act(() => result.current.download(release));
  mockRecords.set(APK_RECORD_KEY, JSON.stringify({ version: '1.3.0', size: 100 }));

  await act(() => result.current.install());

  expect(result.current.status).toBe('error');
  expect(result.current.error).toContain('重新下载');
  expect(mockInstall).not.toHaveBeenCalled();
});
