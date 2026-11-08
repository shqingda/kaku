import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import BlockedUsersScreen from '@/app/blocked-users';

let mockSession: { user: { id: number } } | null = { user: { id: 1 } };
let mockQuery = { data: undefined as number[] | undefined, isError: false, isPaused: false, isPending: true, isRefetching: false, refetch: jest.fn() };

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/lib/use-connectivity', () => ({ useIsOffline: () => false }));
jest.mock('@/features/account/account-sign-in-panel', () => ({ AccountSignInPanel: () => null }));
jest.mock('@/features/auth/auth-provider', () => ({ useAuth: () => ({ isLoading: false, session: mockSession }) }));
jest.mock('@/features/users/blocked-user-names', () => ({
  readBlockedUserNames: () => ({ 7: { nickname: '小明', username: 'ming' } }),
}));
jest.mock('@/features/users/use-blocklist', () => ({ useBlocklist: () => mockQuery }));

beforeEach(() => {
  mockSession = { user: { id: 1 } };
  mockQuery = { data: undefined, isError: false, isPaused: false, isPending: true, isRefetching: false, refetch: jest.fn() };
  jest.mocked(router.push).mockClear();
});

test('reading the list shows loading, offline failure, and an empty state', async () => {
  const screen = await render(<BlockedUsersScreen />);
  expect(screen.getByText('正在读取屏蔽名单')).toBeTruthy();

  mockQuery.isPaused = true;
  await screen.rerender(<BlockedUsersScreen />);
  expect(screen.getByText('屏蔽名单读取失败')).toBeTruthy();

  Object.assign(mockQuery, { data: [], isPaused: false, isPending: false });
  await screen.rerender(<BlockedUsersScreen />);
  expect(screen.getByText('还没有屏蔽任何人')).toBeTruthy();
});

test('the list is read-only: known users open their profile, unknown users show an id', async () => {
  Object.assign(mockQuery, { data: [7, 9], isPending: false });
  const screen = await render(<BlockedUsersScreen />);

  expect(screen.getByText(/你在 Bangumi 网页上绝交的用户/)).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('打开小明的主页'));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/user/[username]', params: { username: 'ming' } });

  expect(screen.getByText('用户 9')).toBeTruthy();
  expect(screen.queryByLabelText('打开用户 9的主页')).toBeNull();
  expect(screen.queryByText('取消屏蔽')).toBeNull();
  expect(screen.queryByText(/取消屏蔽/)).toBeNull();
});
