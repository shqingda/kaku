import { Alert } from 'react-native';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { AccountDeviceSessionsCard } from '@/features/account/account-device-sessions-card';
const mockSingle = jest.fn();
const mockOthers = jest.fn();
let mockAccount = 1;
jest.mock('@/features/auth/auth-provider', () => ({ useAuth: () => ({ session: { user: { id: mockAccount } } }) }));
jest.mock('@/features/theme/theme-provider', () => ({ useTheme: () => ({}) }));
jest.mock('@/features/auth/use-device-sessions', () => ({
  useDeviceSessions: () => ({ data: [{ sessionId: 'other', deviceName: 'Android 设备', lastUsedAt: 1, current: false }] }),
  useRevokeDeviceSession: () => ({ mutateAsync: mockSingle }),
  useRevokeOtherDeviceSessions: () => ({ mutateAsync: mockOthers }),
}));
let alerts: jest.SpyInstance;
beforeEach(() => { mockAccount = 1; mockSingle.mockReset().mockResolvedValue(undefined); mockOthers.mockReset().mockResolvedValue(undefined); alerts = jest.spyOn(Alert, 'alert').mockImplementation(() => {}); });
afterEach(async () => { await cleanup(); alerts.mockRestore(); });
const confirm = () => alerts.mock.calls.at(-1)![2][1].onPress();
test('single and bulk actions only revoke after confirmation', async () => {
  await render(<AccountDeviceSessionsCard />);
  await fireEvent.press(screen.getByLabelText('退出Android 设备'));
  expect(mockSingle).not.toHaveBeenCalled();
  expect(alerts.mock.calls.at(-1)![2][0].style).toBe('cancel');
  await act(confirm);
  expect(mockSingle).toHaveBeenCalledWith('other');
  await fireEvent.press(screen.getByLabelText('退出其他设备'));
  expect(mockOthers).not.toHaveBeenCalled();
  await act(confirm);
  expect(mockOthers).toHaveBeenCalledTimes(1);
});
test('stale confirmation cannot revoke devices after account changes', async () => {
  const view = await render(<AccountDeviceSessionsCard />);
  await fireEvent.press(screen.getByLabelText('退出其他设备'));
  const stale = confirm;
  mockAccount = 2;
  await view.rerender(<AccountDeviceSessionsCard />);
  await act(stale);
  expect(mockOthers).not.toHaveBeenCalled();
  expect(alerts).toHaveBeenLastCalledWith('账号已变化', expect.any(String));
});
test('failed revoke is visible and can be tried again', async () => {
  mockSingle.mockRejectedValueOnce(new Error('网络不可用'));
  await render(<AccountDeviceSessionsCard />);
  await fireEvent.press(screen.getByLabelText('退出Android 设备'));
  await act(confirm);
  expect(alerts).toHaveBeenLastCalledWith('未能退出设备', '网络不可用');
  await fireEvent.press(screen.getByLabelText('退出Android 设备'));
  await act(confirm);
  expect(mockSingle).toHaveBeenCalledTimes(2);
});
