import { AppState, Platform, type AppStateStatus } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import Storage from 'expo-sqlite/kv-store';
import { usePushRegistration } from '@/features/push/use-push-registration';
import { registerPushDevice, unregisterPushDevice } from '@/features/push/device-registration';

let mockSession: { sessionId?: string; user: { id: number } } = { user: { id: 1 } };
const mockCaptureRequest = () => {
  const owner = mockSession;
  return { identity: { userId: owner.user.id, sessionId: owner.sessionId ?? 'test', authEpoch: 0 }, isCurrent: () => mockSession === owner, request: async (...args: Parameters<typeof mockRequest>) => {
    if (mockSession !== owner) throw new Error('登录状态已变化');
    return mockRequest(...args);
  } };
};
const mockPermission = jest.fn();
const mockAskPermission = jest.fn();
const mockToken = jest.fn();
const mockRequest = jest.fn();
let mockTokenListener: (token: { type: string; data: string }) => void;
jest.mock('@/features/auth/auth-provider', () => ({ useAuth: () => ({ session: mockSession, request: mockRequest, captureRequest: mockCaptureRequest }) }));
jest.mock('expo-constants', () => ({ expoConfig: { extra: { push: { apnsEnvironment: 'sandbox', apnsTopic: 'com.shqingda.kaku.debug' } } } }));
jest.mock('expo-sqlite/kv-store', () => ({ getItem: jest.fn(), setItem: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/features/push/device-registration', () => ({ registerPushDevice: jest.fn(), unregisterPushDevice: jest.fn() }));
jest.mock('@/features/push/native-notifications', () => ({
  hasNotificationsNativeModule: () => true,
  isPhysicalDevice: () => true,
  loadNotifications: () => ({
    getPermissionsAsync: mockPermission,
    requestPermissionsAsync: mockAskPermission,
    getDevicePushTokenAsync: mockToken,
    addPushTokenListener: (callback: typeof mockTokenListener) => { mockTokenListener = callback; return { remove: jest.fn() }; },
    setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
    AndroidImportance: { DEFAULT: 3 },
  }),
}));
let listener: (state: AppStateStatus) => void;
beforeEach(() => {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, fn) => {
    listener = fn; return { remove: jest.fn() };
  });
  jest.clearAllMocks();
  mockRequest.mockReset();
  mockSession = { user: { id: 1 } };
  mockPermission.mockReset().mockResolvedValue({ status: 'granted', canAskAgain: true });
  mockAskPermission.mockReset().mockResolvedValue({ status: 'granted' });
  mockToken.mockReset().mockResolvedValue({ type: 'android', data: 'fcm-native-token-local-123456' });
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


test('foreground checks recover permission without asking again and respect disabled intent', async () => {
  mockPermission.mockResolvedValue({ status: 'denied', canAskAgain: true });
  const hook = await renderHook(usePushRegistration);
  expect(hook.result.current.status).toBe('denied');
  expect(mockAskPermission).not.toHaveBeenCalled();
  mockPermission.mockResolvedValue({ status: 'granted' });
  await act(async () => { listener('background'); listener('active'); });
  expect(hook.result.current.status).toBe('on');
  expect(mockAskPermission).not.toHaveBeenCalled();
  await act(() => hook.result.current.setEnabled(false));
  const registrations = jest.mocked(registerPushDevice).mock.calls.length;
  await act(async () => { listener('background'); listener('active'); });
  expect(registerPushDevice).toHaveBeenCalledTimes(registrations);
  expect(hook.result.current.status).toBe('off');
  await hook.unmount();
});

test('only explicitly enabling push may request permission', async () => {
  jest.mocked(Storage.getItem).mockResolvedValue('false');
  mockPermission.mockResolvedValue({ status: 'undetermined', canAskAgain: true });
  const hook = await renderHook(usePushRegistration);
  expect(mockAskPermission).not.toHaveBeenCalled();
  await act(() => hook.result.current.setEnabled(true));
  expect(mockAskPermission).toHaveBeenCalledTimes(1);
  expect(hook.result.current.status).toBe('on');
});

test('late token for an old account is not registered after switching accounts', async () => {
  let finish!: (value: { data: string }) => void;
  mockToken.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const hook = await renderHook(usePushRegistration);
  mockSession = { user: { id: 2 } };
  await hook.rerender(undefined);
  await act(async () => { finish({ data: 'fcm-native-old-token-123456789' }); });
  expect(registerPushDevice).toHaveBeenCalledTimes(1);
  expect(registerPushDevice).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ provider: 'fcm', token: 'fcm-native-token-local-123456' }));
});


test('a delayed device-token write cannot register with a replacement session', async () => {
  let finish!: () => void;
  const pending = new Promise<void>(resolve => { finish = resolve; });
  jest.mocked(registerPushDevice).mockImplementationOnce(async (request) => {
    await pending;
    await request('/me/push-devices', { method: 'POST' });
  });
  const hook = await renderHook(usePushRegistration);
  expect(registerPushDevice).toHaveBeenCalledTimes(1);
  mockSession = { sessionId: 'replacement', user: { id: 1 } };
  await act(async () => { finish(); });
  expect(mockRequest).not.toHaveBeenCalled();
  await hook.rerender(undefined);
  expect(hook.result.current.status).toBe('on');
});

test('iOS registers its APNs token with explicit environment and topic', async () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  mockToken.mockResolvedValue({ type: 'ios', data: 'ab'.repeat(32) });
  const hook = await renderHook(usePushRegistration);
  expect(registerPushDevice).toHaveBeenCalledWith(expect.any(Function), {
    platform: 'ios', provider: 'apns', token: 'ab'.repeat(32), apnsEnvironment: 'sandbox', apnsTopic: 'com.shqingda.kaku.debug',
  });
  expect(hook.result.current.status).toBe('on');
});

test('native token events register their token without asking for a token again', async () => {
  const hook = await renderHook(usePushRegistration);
  const calls = mockToken.mock.calls.length;
  const rolled = { type: 'android', data: 'fcm-native-rolled-token-123456' };
  await act(async () => { mockTokenListener(rolled); });
  expect(mockToken).toHaveBeenCalledTimes(calls);
  expect(registerPushDevice).toHaveBeenLastCalledWith(expect.any(Function), { platform: 'android', provider: 'fcm', token: rolled.data });
  const registrations = jest.mocked(registerPushDevice).mock.calls.length;
  await act(async () => { mockTokenListener(rolled); });
  expect(registerPushDevice).toHaveBeenCalledTimes(registrations);
  await hook.unmount();
});
