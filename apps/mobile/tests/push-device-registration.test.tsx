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
  await expect(registerPushDevice(request, { platform: 'ios', token: 'ExpoPushToken[this-device]' })).rejects.toThrow('offline');
  expect(Storage.setItem).toHaveBeenCalledWith('kaku-push-device-token', 'ExpoPushToken[this-device]');
});
