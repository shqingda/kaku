import { fireEvent, render } from '@testing-library/react-native';

import SubjectRelationsScreen from '@/app/subject/[id]/relations';

const mockRelations = {
  data: undefined, fetchStatus: 'paused', isError: false, isPaused: true,
  isPending: true, isRefetching: false, refetch: jest.fn(),
};

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: unknown }) => children,
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ id: '1' }),
}));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@/lib/use-connectivity', () => ({ useIsOffline: () => true }));
jest.mock('@/features/subject-extras/use-subject-extras', () => ({
  useSubjectRelations: () => mockRelations,
}));

test('a detail page without saved data offers a retry offline instead of loading forever', async () => {
  const screen = await render(<SubjectRelationsScreen />);

  expect(screen.queryByText('正在读取关联条目')).toBeNull();
  expect(screen.getByText('关联条目读取失败')).toBeTruthy();
  expect(screen.getByText('当前离线：联网后将自动恢复重试能力。')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: '重试' }));
  expect(mockRelations.refetch).toHaveBeenCalledTimes(1);
});
