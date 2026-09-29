let mockPlatform = 'android';
let mockChannel = 'github';
let mockAppId = 'com.shqingda.kaku';
let mockStoreId = '';
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return Object.create(actual, { Platform: { value: { ...actual.Platform, get OS() { return mockPlatform; } } } });
});
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.0.0', extra: { get appUpdate() { return { channel: mockChannel, iosAppStoreId: mockStoreId }; } } } } }));
jest.mock('expo-application', () => ({ nativeApplicationVersion: '1.0.1', get applicationId() { return mockAppId; } }));
const originalFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch')!;
const mockFetch = jest.fn();
beforeEach(() => { Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: mockFetch }); jest.resetModules(); mockPlatform = 'android'; mockChannel = 'github'; mockAppId = 'com.shqingda.kaku'; mockStoreId = ''; Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: mockFetch }); mockFetch.mockReset(); });
afterEach(() => { Object.defineProperty(globalThis, 'fetch', originalFetch); });
test('uses native installed version and handles network service failures explicitly', async () => {
  const client = require('@/features/app-update/update-client');
  expect(client.installedVersion).toBe('1.0.1');
  mockFetch.mockResolvedValue({ ok: false, status: 403 });
  await expect(client.fetchLatestRelease()).rejects.toThrow('检查过于频繁');
});
test('debug APK cannot receive a release-channel asset', async () => {
  mockAppId += '.debug';
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ tag_name: 'v1.1.0', assets: [{ name: 'kaku-release.apk', state: 'uploaded', size: 12, browser_download_url: 'https://github.com/shqingda/kaku/releases/download/v1.1.0/kaku-release.apk' }] }) });
  await expect(require('@/features/app-update/update-client').fetchLatestRelease()).rejects.toThrow('当前安装渠道');
});
test('unconfigured iOS channel never claims newest or queries Android releases', async () => {
  mockPlatform = 'ios';
  await expect(require('@/features/app-update/update-client').fetchLatestRelease()).rejects.toThrow('iOS 更新渠道尚未配置');
  expect(mockFetch).not.toHaveBeenCalled();
});
test('App Store result must belong to the installed bundle', async () => {
  mockPlatform = 'ios'; mockStoreId = '123456';
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ results: [{ bundleId: 'wrong.app', version: '2.0.0' }] }) });
  const client = require('@/features/app-update/update-client');
  await expect(client.fetchLatestRelease()).rejects.toThrow('暂未找到');
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({ results: [{ bundleId: mockAppId, version: '1.2.0', releaseNotes: '新功能' }] }) });
  expect(await client.fetchLatestRelease()).toMatchObject({ version: '1.2.0', pageUrl: 'https://apps.apple.com/app/id123456' });
});
