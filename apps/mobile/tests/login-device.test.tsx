import { Platform } from 'react-native';
import { getLoginDevice } from '@/features/auth/login-device';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
jest.mock('expo-application', () => ({ applicationId: 'com.shqingda.kaku', getAndroidId: jest.fn(), getIosIdForVendorAsync: jest.fn() }));
jest.mock('expo-device', () => ({ modelName: 'Pixel 9' }));
jest.mock('expo-crypto', () => ({ CryptoDigestAlgorithm: { SHA256: 'SHA-256' }, digestStringAsync: jest.fn(async (_algorithm, value) => require('node:crypto').createHash('sha256').update(value).digest('hex')) }));
const originalOS = Platform.OS;
afterEach(() => { Platform.OS = originalOS; jest.clearAllMocks(); });
test('same Android identity survives repeated logins, other phones have a different app-scoped digest', async () => {
  Platform.OS = 'android';
  jest.mocked(Application.getAndroidId).mockReturnValue('phone-a');
  const first = await getLoginDevice();
  expect(await getLoginDevice()).toEqual(first);
  expect(first).toEqual({ deviceName: 'Pixel 9', deviceKey: expect.stringMatching(/^[a-f0-9]{64}$/) });
  expect(JSON.stringify(first)).not.toContain('phone-a');
  jest.mocked(Application.getAndroidId).mockReturnValue('phone-b');
  expect((await getLoginDevice()).deviceKey).not.toBe(first.deviceKey);
  expect(Crypto.digestStringAsync).toHaveBeenCalledWith('SHA-256', 'kaku-device-v1:com.shqingda.kaku:android:phone-a');
});
test('unavailable iOS identifier leaves the session ungrouped instead of merging by model', async () => {
  Platform.OS = 'ios';
  jest.mocked(Application.getIosIdForVendorAsync).mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('unavailable'));
  expect(await getLoginDevice()).toEqual({ deviceName: 'Pixel 9' });
  expect(await getLoginDevice()).toEqual({ deviceName: 'Pixel 9' });
});
