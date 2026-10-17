import Storage from 'expo-sqlite/kv-store';
import { registerPushDevice, unregisterPushDevice } from '@/features/push/device-registration';

jest.mock('expo-sqlite/kv-store', () => ({
  getItem: jest.fn(), setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/features/push/native-notifications', () => ({ isPhysicalDevice: () => false, loadNotifications: () => null }));
beforeEach(() => jest.clearAllMocks());

test('unregister includes the persisted device identity', async () => {
  jest.mocked(Storage.getItem).mockResolvedValue('ExpoPushToken[this-device]');
  const request = jest.fn().mockResolvedValue(new Response(null, { status: 204 }));
  await unregisterPushDevice(request);
  expect(request).toHaveBeenCalledWith('/me/push-devices', expect.objectContaining({
    method: 'DELETE', body: JSON.stringify({ token: 'ExpoPushToken[this-device]' }),
  }));
});

test('a device without a known token never sends a user-wide delete', async () => {
  jest.mocked(Storage.getItem).mockResolvedValue(null);
  const request = jest.fn();
  await unregisterPushDevice(request);
  expect(request).not.toHaveBeenCalled();
});

test('registration retains device identity even when the network reply is lost', async () => {
  const request = jest.fn().mockRejectedValue(new Error('offline'));
  await expect(registerPushDevice(request, { platform: 'android', provider: 'fcm', token: 'fcm-native-token-1234567890' })).rejects.toThrow('offline');
  expect(Storage.setItem).toHaveBeenCalledWith('kaku-push-device-token', 'fcm-native-token-1234567890');
});

test('migration and token rotation remove only the persisted previous token before saving the native identity', async () => {
  jest.mocked(Storage.getItem).mockResolvedValue('ExpoPushToken[legacy]');
  const request = jest.fn().mockResolvedValue(new Response(null, { status: 200 }));
  await registerPushDevice(request, { platform: 'android', provider: 'fcm', token: 'fcm-native-token-1234567890' });
  expect(request.mock.calls.map(([, init]) => init.method)).toEqual(['DELETE', 'PUT']);
  expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({ token: 'ExpoPushToken[legacy]' });
});

test('a failed legacy unregister does not overwrite the retained device identity', async () => {
  jest.mocked(Storage.getItem).mockResolvedValue('ExpoPushToken[legacy]');
  const request = jest.fn().mockRejectedValue(new Error('offline'));
  await expect(registerPushDevice(request, { platform: 'android', provider: 'fcm', token: 'fcm-native-token-1234567890' })).rejects.toThrow('offline');
  expect(Storage.setItem).not.toHaveBeenCalled();
});
