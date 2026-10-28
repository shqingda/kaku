import { Alert } from 'react-native';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { AccountSignOutActions } from '@/features/account/account-sign-out-actions';
const mockSignOut = jest.fn();
const mockDisconnect = jest.fn();
jest.mock('@/features/auth/auth-provider', () => ({ useAuth: () => ({ signOut: mockSignOut, disconnectBangumi: mockDisconnect }) }));
let alerts: jest.SpyInstance;
beforeEach(() => {
  mockSignOut.mockReset().mockResolvedValue(undefined);
  mockDisconnect.mockReset().mockResolvedValue(undefined);
  alerts = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(async () => { await cleanup(); alerts.mockRestore(); });
test('current-device sign out runs directly without disconnecting other devices', async () => {
  await render(<AccountSignOutActions />);
  await fireEvent.press(screen.getByText('退出当前设备'));
  expect(mockSignOut).toHaveBeenCalledTimes(1);
  expect(mockDisconnect).not.toHaveBeenCalled();
  expect(alerts).not.toHaveBeenCalled();
});
test('disconnect explains its all-device effect, requires confirmation and exposes failure inline', async () => {
  mockDisconnect.mockRejectedValueOnce(new Error('offline'));
  await render(<AccountSignOutActions />);
  await fireEvent.press(screen.getByText('退出所有设备并解除连接'));
  expect(mockDisconnect).not.toHaveBeenCalled();
  expect(alerts.mock.calls[0][1]).toContain('包括当前设备');
  await act(async () => { await alerts.mock.calls[0][2][1].onPress(); });
  expect(screen.getByText('操作未完成，请重试。')).toBeTruthy();
  expect(mockSignOut).not.toHaveBeenCalled();
});
