import { fireEvent, render } from '@testing-library/react-native';

import { ProfileOverflow } from '@/features/users/profile-overflow';

const mockRemember = jest.fn();
let mockBlocklist: number[] = [];

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/features/auth/auth-provider', () => ({ useAuth: () => ({ session: { user: { id: 1 } } }) }));
jest.mock('@/features/shared/app-action-menu', () => {
  const { Text, View } = require('react-native');
  return { AppActionMenu: ({ visible, actions }: any) => visible ? <View>{actions.map((a: any) => <Text key={a.id}>{a.label}</Text>)}</View> : null };
});
jest.mock('@/features/reports/report-sheet', () => ({ ReportSheet: () => null }));
jest.mock('@/features/users/blocked-user-names', () => ({
  rememberBlockedUserName: (...args: unknown[]) => mockRemember(...args),
}));
jest.mock('@/features/users/use-blocklist', () => ({ useBlocklist: () => ({ data: mockBlocklist }) }));

beforeEach(() => {
  mockRemember.mockClear();
  mockBlocklist = [];
});

test('the menu offers reporting but no block action Bangumi cannot save', async () => {
  const screen = await render(<ProfileOverflow nickname="小明" userId={7} username="ming" />);

  await fireEvent.press(screen.getByLabelText('更多操作：小明'));

  expect(screen.getByText('举报该用户')).toBeTruthy();
  expect(screen.queryByText('屏蔽该用户')).toBeNull();
  expect(screen.queryByText('取消屏蔽')).toBeNull();
  expect(mockRemember).not.toHaveBeenCalled();
});

test('opening a user already on the Bangumi list remembers their name for the list screen', async () => {
  mockBlocklist = [7];
  await render(<ProfileOverflow nickname="小明" userId={7} username="ming" />);

  expect(mockRemember).toHaveBeenCalledWith(1, 7, { nickname: '小明', username: 'ming' });
});
