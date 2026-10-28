import { Alert } from 'react-native';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { AccountSignOutActions } from '@/features/account/account-sign-out-actions';
const mockSignOut = jest.fn();
jest.mock('@/features/auth/auth-provider', () => ({ useAuth: () => ({ signOut: mockSignOut }) }));
let alerts: jest.SpyInstance;
beforeEach(() => {
  mockSignOut.mockReset().mockResolvedValue(undefined);
  alerts = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(async () => { await cleanup(); alerts.mockRestore(); });
test('current-device sign out runs directly without disconnecting other devices', async () => {
  await render(<AccountSignOutActions />);
  await fireEvent.press(screen.getByText('退出登录'));
  expect(mockSignOut).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(/断开|解除连接/)).toBeNull();
  expect(alerts).not.toHaveBeenCalled();
});
test('failed sign out stays visible without adding a result dialog', async () => {
  mockSignOut.mockRejectedValueOnce(new Error('offline'));
  await render(<AccountSignOutActions />);
  await fireEvent.press(screen.getByText('退出登录'));
  expect(screen.getByText('操作未完成，请重试。')).toBeTruthy();
  expect(alerts).not.toHaveBeenCalled();
});
