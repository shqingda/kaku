import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import BlockedUsersScreen from '@/app/blocked-users';

let mockSession: { user: { id: number } } | null = { user: { id: 1 } };
let mockQuery = { data: undefined as number[] | undefined, isError: false, isPaused: false, isPending: true, isRefetching: false, refetch: jest.fn() };
const mockMutate = jest.fn();
const mockUsernames: string[] = [];

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/lib/use-connectivity', () => ({ useIsOffline: () => false }));
jest.mock('@/features/account/account-sign-in-panel', () => ({ AccountSignInPanel: () => null }));
jest.mock('@/features/auth/auth-provider', () => ({ useAuth: () => ({ isLoading: false, session: mockSession }) }));
jest.mock('@/features/users/blocked-user-names', () => ({
  readBlockedUserNames: () => ({ 7: { nickname: '小明', username: 'ming' } }),
}));
jest.mock('@/features/users/use-blocklist', () => ({
  useBlocklist: () => mockQuery,
  useSetUserBlocked: (username: string) => {
    mockUsernames.push(username);
    return { isPending: false, mutate: mockMutate };
  },
}));

beforeEach(() => {
  mockSession = { user: { id: 1 } };
  mockQuery = { data: undefined, isError: false, isPaused: false, isPending: true, isRefetching: false, refetch: jest.fn() };
  mockMutate.mockClear(); mockUsernames.length = 0;
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

test('known users open their profile and unknown users can still be unblocked by id', async () => {
  Object.assign(mockQuery, { data: [7, 9], isPending: false });
  const screen = await render(<BlockedUsersScreen />);

  await fireEvent.press(screen.getByLabelText('打开小明的主页'));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/user/[username]', params: { username: 'ming' } });

  expect(screen.getByText('用户 9')).toBeTruthy();
  expect(screen.queryByLabelText('打开用户 9的主页')).toBeNull();
  expect(mockUsernames).toEqual(expect.arrayContaining(['ming', '9']));
  await fireEvent.press(screen.getByLabelText('取消屏蔽用户 9'));
  expect(mockMutate).toHaveBeenCalledWith(false, expect.objectContaining({ onError: expect.any(Function) }));
});
