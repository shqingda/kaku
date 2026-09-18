import { act, renderHook } from '@testing-library/react-native';
import Storage from 'expo-sqlite/kv-store';
import { usePushRegistration } from '@/features/push/use-push-registration';
import { registerPushDevice, unregisterPushDevice } from '@/features/push/device-registration';

const mockSession = { user: { id: 1 } };
const mockRequest = jest.fn();
jest.mock('@/features/auth/auth-provider', () => ({ useAuth: () => ({ session: mockSession, request: mockRequest }) }));
jest.mock('expo-constants', () => ({ expoConfig: { extra: { eas: { projectId: 'project' } } } }));
jest.mock('expo-sqlite/kv-store', () => ({ getItem: jest.fn(), setItem: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/features/push/device-registration', () => ({ registerPushDevice: jest.fn(), unregisterPushDevice: jest.fn() }));
jest.mock('@/features/push/native-notifications', () => ({
  hasNotificationsNativeModule: () => true,
  isPhysicalDevice: () => true,
  loadNotifications: () => ({
    requestPermissionsAsync: async () => ({ status: 'granted' }),
    getExpoPushTokenAsync: async () => ({ data: 'ExpoPushToken[local]' }),
  }),
}));
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(Storage.getItem).mockResolvedValue('true');
  jest.mocked(registerPushDevice).mockResolvedValue(undefined);
  jest.mocked(unregisterPushDevice).mockResolvedValue(undefined);
});

test('does not unregister before restoring the persisted enabled flag', async () => {
  let restore!: (value: string) => void;
  jest.mocked(Storage.getItem).mockReturnValue(new Promise(resolve => { restore = resolve; }));
  const hook = await renderHook(usePushRegistration);
  expect(unregisterPushDevice).not.toHaveBeenCalled();
  await act(async () => { restore('true'); });
  expect(registerPushDevice).toHaveBeenCalledTimes(1);
  expect(unregisterPushDevice).not.toHaveBeenCalled();
  expect(hook.result.current.status).toBe('on');
});

test('turning push off finishes after any in-flight registration', async () => {
  let finish!: () => void;
  jest.mocked(registerPushDevice).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const hook = await renderHook(usePushRegistration);
  await act(() => hook.result.current.setEnabled(false));
  expect(unregisterPushDevice).not.toHaveBeenCalled();
  await act(async () => { finish(); });
  expect(unregisterPushDevice).toHaveBeenCalledTimes(1);
  expect(hook.result.current.status).toBe('off');
});

test('failed unregister stays visible and can be retried', async () => {
  jest.mocked(Storage.getItem).mockResolvedValue('false');
  jest.mocked(unregisterPushDevice).mockRejectedValueOnce(new Error('offline'));
  const hook = await renderHook(usePushRegistration);
  expect(hook.result.current.status).toBe('failed');
  await act(() => hook.result.current.retry());
  expect(hook.result.current.status).toBe('off');
});
